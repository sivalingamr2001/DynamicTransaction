using Dapper;
using DynamicTransaction.Interfaces;
using DynamicTransaction.Models;
using DynamicTransaction.Infrastructure;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace DynamicTransaction.Services;

/// <summary>
/// Core implementation of ITransactionCommandService.
/// Validates transaction names and properties against a strict metadata map (preventing SQL injection),
/// enforces pre-execution validation constraints, resolves Oracle primary key strategies (sequences/identities),
/// and orchestrates CRUD parent-child operations inside a database transaction boundary.
/// </summary>
public sealed class TransactionCommandService : ITransactionCommandService
{
    private readonly IDapperCommandExecutor _commandExecutor;
    private readonly ILogger<TransactionCommandService> _logger;

    // Secure database mapping registry containing allowlisted tables, columns, sequences, and relationships
    private static readonly Dictionary<string, TransactionMapping> Mappings = new(StringComparer.OrdinalIgnoreCase)
    {
        ["SalesPlan"] = new()
        {
            TransactionName = "SalesPlan",
            MainTableName = "JAN_PICK_FORWARD_CONTROL",
            PrimaryKeyColumn = "PICK_FORWARD_ID",
            AutoIncrementPrimaryKey = true,
            SequenceName = null, // Identity/returning-based
            AllowedColumns = new(StringComparer.OrdinalIgnoreCase)
            {
                "PICK_FORWARD_ID", "CUSTOMER_ID", "CUSTOMER_NAME", "CUSTOMER_CATEGORY", 
                "REGION", "SUB_REGION", "STATUS", "COMMENTS", "CREATED_BY", "CREATED_DATE"
            },
            ChildMappings = new(StringComparer.OrdinalIgnoreCase)
            {
                ["SalesPlanLine"] = new()
                {
                    TableName = "JAN_PICK_FORWARD_LINES",
                    PrimaryKeyColumn = "LINE_ID",
                    ForeignKeyColumn = "PICK_FORWARD_ID",
                    AllowedColumns = new(StringComparer.OrdinalIgnoreCase)
                    {
                        "LINE_ID", "PICK_FORWARD_ID", "ITEM_CODE", "QUANTITY", "SHIP_DATE", "STATUS"
                    }
                }
            }
        },
        ["ReplenishmentBin"] = new()
        {
            TransactionName = "ReplenishmentBin",
            MainTableName = "JAN_REPLENISH_BIN_TAB",
            PrimaryKeyColumn = "BIN_ID",
            AutoIncrementPrimaryKey = true,
            SequenceName = "JAN_REPLENISH_BIN_SEQ", // Sequence-based pre-fetch
            AllowedColumns = new(StringComparer.OrdinalIgnoreCase)
            {
                "BIN_ID", "BIN_CODE", "REGION", "SUB_REGION", "STATUS", "CREATED_BY"
            },
            ChildMappings = new(StringComparer.OrdinalIgnoreCase)
            {
                ["BinDetails"] = new()
                {
                    TableName = "JAN_REPLENISH_BIN_DETAILS",
                    PrimaryKeyColumn = "DETAIL_ID",
                    ForeignKeyColumn = "BIN_ID",
                    AllowedColumns = new(StringComparer.OrdinalIgnoreCase)
                    {
                        "DETAIL_ID", "BIN_ID", "ITEM_CODE", "QUANTITY"
                    }
                }
            }
        }
    };

    public TransactionCommandService(IDapperCommandExecutor commandExecutor, ILogger<TransactionCommandService> logger)
    {
        _commandExecutor = commandExecutor ?? throw new ArgumentNullException(nameof(commandExecutor));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <inheritdoc/>
    public async Task<TransactionCommandResponse> ExecuteTransactionAsync(
        TransactionCommandRequest request,
        CancellationToken cancellationToken = default)
    {
        // 1. TransactionName Validation
        if (request == null)
        {
            return StructuredError("Validation failed: Request payload cannot be null.", "None", "Validation");
        }

        if (string.IsNullOrWhiteSpace(request.TransactionName))
        {
            return StructuredError("Validation failed: TransactionName is required.", "None", "Validation");
        }

        if (!Mappings.TryGetValue(request.TransactionName, out var mapping))
        {
            return StructuredError($"Validation failed: Unknown or unauthorized TransactionName '{request.TransactionName}'.", "None", "NotFound");
        }

        long transactionId = request.TransactionId ?? 0;
        string operation = transactionId > 0 ? "Update" : "Create";

        // 2. Perform Pre-Execution Validations
        var validationError = ValidateRequest(request, mapping, operation);
        if (validationError != null)
        {
            _logger.LogWarning("TransactionCommandService.ExecuteTransactionAsync Validation FAILED. Name: {Name}, Error: {Error}", request.TransactionName, validationError.Message);
            return validationError;
        }

        int totalRowsAffected = 0;
        var sw = System.Diagnostics.Stopwatch.StartNew();

        var redactedMain = SafeLogExtensions.RedactParameters(request.MainProps);
        var redactedChild = SafeLogExtensions.RedactParameters(request.ChildProps);
        var redactedDel = SafeLogExtensions.RedactParameters(request.DelProps);

        _logger.LogInformation("TransactionCommandService.ExecuteTransactionAsync START. TransactionName: {Name}, Operation: {Operation}, MainProps: {MainProps}, ChildProps: {ChildProps}, DelProps: {DelProps}",
            request.TransactionName, operation, redactedMain, redactedChild, redactedDel);

        try
        {
            // Execute operations under a single database transaction
            totalRowsAffected = await _commandExecutor.ExecuteInTransactionAsync(async (tx) =>
            {
                int rowsInTx = 0;

                // Phase A: DELETE Operations (Children deleted first to avoid foreign key violations)
                if (request.DelProps != null)
                {
                    foreach (var delProp in request.DelProps)
                    {
                        var entityKey = delProp.Key;
                        var delItems = delProp.Value as JArray;
                        if (delItems == null || delItems.Count == 0) continue;

                        string targetTableName;
                        string targetKeyColumn;

                        if (string.Equals(entityKey, mapping.TransactionName, StringComparison.OrdinalIgnoreCase) ||
                            string.Equals(entityKey, mapping.MainTableName, StringComparison.OrdinalIgnoreCase))
                        {
                            targetTableName = mapping.MainTableName;
                            targetKeyColumn = mapping.PrimaryKeyColumn;
                        }
                        else // Must be a child mapping
                        {
                            var childMap = mapping.ChildMappings[entityKey]; // Already validated in ValidateRequest
                            targetTableName = childMap.TableName;
                            targetKeyColumn = childMap.PrimaryKeyColumn;
                        }

                        foreach (var item in delItems)
                        {
                            object? idValue;
                            if (item.Type == JTokenType.Object)
                            {
                                var obj = (JObject)item;
                                var pkValProp = obj.Properties().FirstOrDefault(p => string.Equals(p.Name, targetKeyColumn, StringComparison.OrdinalIgnoreCase));
                                idValue = ConvertJTokenToValue(pkValProp?.Value);
                            }
                            else
                            {
                                idValue = ConvertJTokenToValue(item);
                            }

                            var deleteSql = BuildDeleteSql(targetTableName, targetKeyColumn);
                            rowsInTx += await _commandExecutor.ExecuteAsync(
                                deleteSql,
                                new Dictionary<string, object?> { ["_key_id_"] = idValue },
                                transaction: tx,
                                cancellationToken: cancellationToken);
                        }
                    }
                }

                // Phase B: Main Record INSERT or UPDATE
                if (request.MainProps != null && request.MainProps.HasValues)
                {
                    var mainPropsDict = new Dictionary<string, object?>();
                    foreach (var prop in request.MainProps.Properties())
                    {
                        // Skip primary key during insert if auto-generated
                        bool isPk = string.Equals(prop.Name, mapping.PrimaryKeyColumn, StringComparison.OrdinalIgnoreCase);
                        if (operation == "Create" && isPk && (mapping.AutoIncrementPrimaryKey || !string.IsNullOrWhiteSpace(mapping.SequenceName)))
                        {
                            continue;
                        }
                        mainPropsDict[prop.Name] = ConvertJTokenToValue(prop.Value);
                    }

                    if (operation == "Create")
                    {
                        // Rule 5: Primary key generation priority
                        if (!string.IsNullOrWhiteSpace(mapping.SequenceName))
                        {
                            // Priority 1: Sequence pre-fetch
                            var seqSql = $"SELECT {mapping.SequenceName}.NEXTVAL FROM DUAL";
                            var nextIdVal = await _commandExecutor.ExecuteScalarAsync<object>(seqSql, transaction: tx, cancellationToken: cancellationToken);
                            
                            if (nextIdVal == null)
                            {
                                throw new InvalidOperationException($"Sequence pre-fetch failed for sequence '{mapping.SequenceName}'.");
                            }
                            
                            transactionId = ConvertToInt64(nextIdVal);
                            mainPropsDict[mapping.PrimaryKeyColumn] = transactionId;

                            // Standard insert
                            var columns = mainPropsDict.Keys.ToList();
                            var insertSql = BuildInsertSql(mapping.MainTableName, columns, null);

                            rowsInTx += await _commandExecutor.ExecuteAsync(
                                insertSql,
                                mainPropsDict,
                                transaction: tx,
                                cancellationToken: cancellationToken);
                        }
                        else if (mapping.AutoIncrementPrimaryKey)
                        {
                            // Priority 2: RETURNING INTO with Dapper output parameter
                            var columns = mainPropsDict.Keys.ToList();
                            var insertSql = BuildInsertSql(mapping.MainTableName, columns, mapping.PrimaryKeyColumn);

                            var oracleParams = new OracleDynamicParameters();
                            foreach (var kvp in mainPropsDict)
                            {
                                oracleParams.Add(kvp.Key, kvp.Value);
                            }
                            oracleParams.Add("generatedId", dbType: DbType.Int64, direction: ParameterDirection.Output);

                            rowsInTx += await _commandExecutor.ExecuteAsync(
                                insertSql,
                                oracleParams,
                                transaction: tx,
                                cancellationToken: cancellationToken);

                            transactionId = ConvertToInt64(oracleParams.GetValue("generatedId"));
                        }
                        else
                        {
                            // Priority 3: Manual primary key (must already be in props dictionary)
                            var columns = mainPropsDict.Keys.ToList();
                            var insertSql = BuildInsertSql(mapping.MainTableName, columns, null);

                            rowsInTx += await _commandExecutor.ExecuteAsync(
                                insertSql,
                                mainPropsDict,
                                transaction: tx,
                                cancellationToken: cancellationToken);
                        }
                    }
                    else // Operation is UPDATE
                    {
                        var updateColumns = mainPropsDict.Keys.Where(c => !string.Equals(c, mapping.PrimaryKeyColumn, StringComparison.OrdinalIgnoreCase)).ToList();
                        var updateSql = BuildUpdateSql(mapping.MainTableName, updateColumns, mapping.PrimaryKeyColumn);

                        var oracleParams = new OracleDynamicParameters();
                        foreach (var col in updateColumns)
                        {
                            oracleParams.Add(col, mainPropsDict[col]);
                        }
                        oracleParams.Add("_key_id_", transactionId);

                        rowsInTx += await _commandExecutor.ExecuteAsync(
                            updateSql,
                            oracleParams,
                            transaction: tx,
                            cancellationToken: cancellationToken);
                    }
                }

                // Phase C: Child Records INSERT or UPDATE
                if (request.ChildProps != null)
                {
                    foreach (var childProp in request.ChildProps)
                    {
                        var childKey = childProp.Key;
                        var childItems = childProp.Value as JArray;
                        if (childItems == null || childItems.Count == 0) continue;

                        var childMap = mapping.ChildMappings[childKey];

                        foreach (var childItem in childItems)
                        {
                            var childObj = (JObject)childItem;
                            var childDict = new Dictionary<string, object?>();
                            foreach (var prop in childObj.Properties())
                            {
                                childDict[prop.Name] = ConvertJTokenToValue(prop.Value);
                            }

                            // Propagate parent primary key as child foreign key
                            childDict[childMap.ForeignKeyColumn] = transactionId;

                            // Evaluate child insert vs update
                            var childPkProp = childObj.GetValue(childMap.PrimaryKeyColumn);
                            bool isChildUpdate = childPkProp != null && childPkProp.Type != JTokenType.Null && childPkProp.Value<long>() > 0;

                            if (isChildUpdate)
                            {
                                var updateColumns = childDict.Keys.Where(c => !string.Equals(c, childMap.PrimaryKeyColumn, StringComparison.OrdinalIgnoreCase)).ToList();
                                var updateSql = BuildUpdateSql(childMap.TableName, updateColumns, childMap.PrimaryKeyColumn);

                                var oracleParams = new OracleDynamicParameters();
                                foreach (var col in updateColumns)
                                {
                                    oracleParams.Add(col, childDict[col]);
                                }
                                oracleParams.Add("_key_id_", childPkProp!.Value<long>());

                                rowsInTx += await _commandExecutor.ExecuteAsync(
                                    updateSql,
                                    oracleParams,
                                    transaction: tx,
                                    cancellationToken: cancellationToken);
                            }
                            else
                            {
                                var insertColumns = childDict.Keys.ToList();
                                // Skip child primary key if it's not provided
                                if (childPkProp == null || childPkProp.Type == JTokenType.Null)
                                {
                                    insertColumns = insertColumns.Where(c => !string.Equals(c, childMap.PrimaryKeyColumn, StringComparison.OrdinalIgnoreCase)).ToList();
                                }

                                var insertSql = BuildInsertSql(childMap.TableName, insertColumns, null);

                                var oracleParams = new OracleDynamicParameters();
                                foreach (var col in insertColumns)
                                {
                                    oracleParams.Add(col, childDict[col]);
                                }

                                rowsInTx += await _commandExecutor.ExecuteAsync(
                                    insertSql,
                                    oracleParams,
                                    transaction: tx,
                                    cancellationToken: cancellationToken);
                            }
                        }
                    }
                }

                return rowsInTx;
            });

            _logger.LogInformation("TransactionCommandService.ExecuteTransactionAsync SUCCESS. TransactionName: {Name}, Operation: {Operation}, RowsAffected: {RowsAffected}, TransactionId: {TxId}, DurationMs: {DurationMs}, Success: true",
                request.TransactionName, operation, totalRowsAffected, transactionId, sw.ElapsedMilliseconds);

            return new TransactionCommandResponse
            {
                Success = true,
                TransactionId = transactionId,
                RowsAffected = totalRowsAffected,
                Operation = operation,
                Message = "Database transaction executed successfully."
            };
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("TransactionCommandService.ExecuteTransactionAsync CANCELED. TransactionName: {Name}, DurationMs: {DurationMs}", request.TransactionName, sw.ElapsedMilliseconds);
            throw;
        }
        catch (Exception ex)
        {
            // Log full details on server, but return generic error to API (no raw SQL/stack trace)
            _logger.LogError(ex, "TransactionCommandService.ExecuteTransactionAsync ERROR. TransactionName: {Name}, Operation: {Operation}, DurationMs: {DurationMs}, Success: false, ErrorMessage: {ErrorMessage}",
                request.TransactionName, operation, sw.ElapsedMilliseconds, ex.Message);

            return new TransactionCommandResponse
            {
                Success = false,
                TransactionId = transactionId,
                RowsAffected = 0,
                Operation = operation,
                Message = "Database operation failed. An internal server error occurred while writing data.",
                ErrorType = "Database"
            };
        }
    }

    // ── Safe pre-execution request validations ───────────────────────────────────────────

    private static TransactionCommandResponse? ValidateRequest(TransactionCommandRequest request, TransactionMapping mapping, string operation)
    {
        // A. Validation for empty create payload
        if (operation == "Create" && (request.MainProps == null || !request.MainProps.HasValues))
        {
            return StructuredError("Validation failed: MainProps payload cannot be empty for a Create (INSERT) operation.", operation);
        }

        // B. Validation for empty update column list
        if (operation == "Update")
        {
            if (request.MainProps == null || !request.MainProps.HasValues)
            {
                bool hasChildOps = request.ChildProps != null && request.ChildProps.HasValues;
                bool hasDelOps = request.DelProps != null && request.DelProps.HasValues;
                if (!hasChildOps && !hasDelOps)
                {
                    return StructuredError("Validation failed: Update request must contain at least one main record update, child update, or deletion operation.", operation);
                }
            }
            else
            {
                var writableColumns = request.MainProps.Properties()
                    .Select(p => p.Name)
                    .Where(c => !string.Equals(c, mapping.PrimaryKeyColumn, StringComparison.OrdinalIgnoreCase))
                    .ToList();

                if (writableColumns.Count == 0)
                {
                    return StructuredError("Validation failed: MainProps must contain at least one column to update (excluding the primary key).", operation);
                }
            }
        }

        // C. Manual Primary Key validation
        if (operation == "Create" && !mapping.AutoIncrementPrimaryKey && string.IsNullOrWhiteSpace(mapping.SequenceName))
        {
            var pkProp = request.MainProps?.GetValue(mapping.PrimaryKeyColumn);
            if (pkProp == null || pkProp.Type == JTokenType.Null || pkProp.Value<long>() <= 0)
            {
                return StructuredError($"Validation failed: Primary key '{mapping.PrimaryKeyColumn}' must be provided in MainProps when auto-increment and sequence strategy are disabled.", operation);
            }
        }

        // D. Main table allowed columns check (Reject unknown columns)
        if (request.MainProps != null)
        {
            foreach (var prop in request.MainProps.Properties())
            {
                // Primary key is auto-injected during Create, so it doesn't need to be in MainProps
                bool isAutoGeneratedPk = string.Equals(prop.Name, mapping.PrimaryKeyColumn, StringComparison.OrdinalIgnoreCase) && 
                                         (mapping.AutoIncrementPrimaryKey || !string.IsNullOrWhiteSpace(mapping.SequenceName));
                
                if (operation == "Create" && isAutoGeneratedPk) continue;

                if (!mapping.AllowedColumns.Contains(prop.Name))
                {
                    return StructuredError($"Validation failed: Unknown column '{prop.Name}' in main table '{mapping.MainTableName}'.", operation);
                }
            }

            // Validation for insert having no columns at all (excluding PK)
            var insertableColumns = request.MainProps.Properties()
                .Select(p => p.Name)
                .Where(c => !string.Equals(c, mapping.PrimaryKeyColumn, StringComparison.OrdinalIgnoreCase) || (!mapping.AutoIncrementPrimaryKey && string.IsNullOrWhiteSpace(mapping.SequenceName)))
                .ToList();
            
            if (operation == "Create" && insertableColumns.Count == 0)
            {
                return StructuredError("Validation failed: MainProps has no columns available to insert.", operation);
            }
        }

        // E. Child payload validation (shape, keys, allowed columns)
        if (request.ChildProps != null)
        {
            foreach (var childProp in request.ChildProps)
            {
                var childKey = childProp.Key;

                // Unknown child mapping key
                if (!mapping.ChildMappings.TryGetValue(childKey, out var childMap))
                {
                    return StructuredError($"Validation failed: Child entity mapping '{childKey}' is not configured under transaction mapping '{mapping.TransactionName}'.", operation);
                }

                // Value is not a JSON array
                var childItems = childProp.Value as JArray;
                if (childItems == null)
                {
                    return StructuredError($"Validation failed: Value for ChildProps key '{childKey}' must be a JSON array.", operation);
                }

                foreach (var childItem in childItems)
                {
                    // Item in child array is not a JSON object
                    var childObj = childItem as JObject;
                    if (childObj == null)
                    {
                        return StructuredError($"Validation failed: All child items in array '{childKey}' must be JSON objects.", operation);
                    }

                    // Check allowed columns in child object
                    var childPropsList = childObj.Properties().ToList();
                    foreach (var prop in childPropsList)
                    {
                        if (!childMap.AllowedColumns.Contains(prop.Name))
                        {
                            return StructuredError($"Validation failed: Unknown column '{prop.Name}' in child table '{childMap.TableName}'.", operation);
                        }
                    }

                    // Evaluate child update vs child insert
                    var childPkProp = childObj.GetValue(childMap.PrimaryKeyColumn);
                    bool isChildUpdate = childPkProp != null && childPkProp.Type != JTokenType.Null && childPkProp.Value<long>() > 0;

                    if (isChildUpdate)
                    {
                        // Check child update writable columns
                        var childWritableCols = childPropsList
                            .Select(p => p.Name)
                            .Where(c => !string.Equals(c, childMap.PrimaryKeyColumn, StringComparison.OrdinalIgnoreCase))
                            .ToList();
                        
                        if (childWritableCols.Count == 0)
                        {
                            return StructuredError($"Validation failed: Child update in table '{childMap.TableName}' has no columns to update (excluding the primary key).", operation);
                        }
                    }
                }
            }
        }

        // F. Deletion payload validation (DelProps target, shape, missing keys)
        if (request.DelProps != null)
        {
            if (!request.DelProps.HasValues)
            {
                return StructuredError("Validation failed: DelProps must not be empty if provided.", operation);
            }

            foreach (var delProp in request.DelProps)
            {
                var entityKey = delProp.Key;

                // Value is not a JSON array
                var delItems = delProp.Value as JArray;
                if (delItems == null)
                {
                    return StructuredError($"Validation failed: DelProps value for target '{entityKey}' must be a JSON array.", operation);
                }

                if (delItems.Count == 0)
                {
                    return StructuredError($"Validation failed: Deletion list for target '{entityKey}' must not be empty.", operation);
                }

                string targetKeyColumn;
                if (string.Equals(entityKey, mapping.TransactionName, StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(entityKey, mapping.MainTableName, StringComparison.OrdinalIgnoreCase))
                {
                    targetKeyColumn = mapping.PrimaryKeyColumn;
                }
                else if (mapping.ChildMappings.TryGetValue(entityKey, out var childMap))
                {
                    targetKeyColumn = childMap.PrimaryKeyColumn;
                }
                else
                {
                    return StructuredError($"Validation failed: Delete target '{entityKey}' is not configured for TransactionName '{mapping.TransactionName}'.", operation);
                }

                foreach (var item in delItems)
                {
                    object? idValue = null;
                    if (item.Type == JTokenType.Object)
                    {
                        var obj = (JObject)item;
                        var pkValProp = obj.Properties().FirstOrDefault(p => string.Equals(p.Name, targetKeyColumn, StringComparison.OrdinalIgnoreCase));
                        var pkVal = pkValProp?.Value;
                        if (pkVal != null && pkVal.Type != JTokenType.Null)
                        {
                            idValue = ConvertJTokenToValue(pkVal);
                        }
                    }
                    else
                    {
                        idValue = ConvertJTokenToValue(item);
                    }

                    // Do not silently skip delete items with missing/null/zero IDs
                    if (idValue == null)
                    {
                        return StructuredError($"Validation failed: Deletion item in target '{entityKey}' is missing key '{targetKeyColumn}'.", operation);
                    }
                    
                    if ((idValue is long l && l <= 0) || (idValue is int i && i <= 0) || (idValue is string s && string.IsNullOrWhiteSpace(s)))
                    {
                        return StructuredError($"Validation failed: Deletion item in target '{entityKey}' contains an invalid primary key value (0, empty, or negative).", operation);
                    }
                }
            }
        }

        return null;
    }

    private static TransactionCommandResponse StructuredError(string message, string operation, string errorType = "Validation")
    {
        return new TransactionCommandResponse
        {
            Success = false,
            TransactionId = 0,
            RowsAffected = 0,
            Operation = operation,
            Message = message,
            ErrorType = errorType
        };
    }

    // ── Parameterized SQL statement builders (Parameters taken strictly from allowlist) ───────────────────────────────────

    private static string BuildInsertSql(string tableName, IEnumerable<string> columns, string? primaryKeyColumn)
    {
        var colsList = columns.ToList();
        var valuePlaceholders = colsList.Select(c => ":" + c);

        string sql = $"INSERT INTO {tableName} ({string.Join(", ", colsList)}) VALUES ({string.Join(", ", valuePlaceholders)})";

        if (!string.IsNullOrWhiteSpace(primaryKeyColumn))
        {
            sql += $" RETURNING {primaryKeyColumn} INTO :generatedId";
        }

        return sql;
    }

    private static string BuildUpdateSql(string tableName, IEnumerable<string> columns, string keyColumn)
    {
        var colsList = columns.ToList();
        var setClauses = colsList.Select(c => $"{c} = :{c}");

        return $"UPDATE {tableName} SET {string.Join(", ", setClauses)} WHERE {keyColumn} = :_key_id_";
    }

    private static string BuildDeleteSql(string tableName, string keyColumn)
    {
        return $"DELETE FROM {tableName} WHERE {keyColumn} = :_key_id_";
    }

    private static object? ConvertJTokenToValue(JToken? token)
    {
        if (token == null || token.Type is JTokenType.Null or JTokenType.Undefined)
            return null;

        return token.Type switch
        {
            JTokenType.Boolean => token.Value<bool>() ? 1 : 0,
            JTokenType.Integer => token.Value<long>(),
            JTokenType.Float => token.Value<double>(),
            JTokenType.Date => token.Value<DateTime>(),
            JTokenType.Guid => token.Value<Guid>(),
            JTokenType.String => token.Value<string>(),
            _ => token.ToString(Newtonsoft.Json.Formatting.None)
        };
    }

    private static long ConvertToInt64(object? value)
    {
        if (value == null || value == DBNull.Value)
        {
            throw new InvalidOperationException("Oracle generated ID returned null or DBNull.");
        }

        var typeName = value.GetType().FullName;
        if (typeName == "Oracle.ManagedDataAccess.Types.OracleDecimal")
        {
            dynamic oracleDecimal = value;
            if (oracleDecimal.IsNull)
            {
                throw new InvalidOperationException("Oracle decimal value is null.");
            }
            return Convert.ToInt64(oracleDecimal.Value);
        }

        return Convert.ToInt64(value);
    }

    // Secure database config descriptors
    private sealed class TransactionMapping
    {
        public string TransactionName { get; set; } = string.Empty;
        public string MainTableName { get; set; } = string.Empty;
        public string PrimaryKeyColumn { get; set; } = string.Empty;
        public bool AutoIncrementPrimaryKey { get; set; } = true;
        public string? SequenceName { get; set; }
        public HashSet<string> AllowedColumns { get; set; } = new(StringComparer.OrdinalIgnoreCase);
        public Dictionary<string, ChildMapping> ChildMappings { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    }

    private sealed class ChildMapping
    {
        public string TableName { get; set; } = string.Empty;
        public string PrimaryKeyColumn { get; set; } = string.Empty;
        public string ForeignKeyColumn { get; set; } = string.Empty;
        public HashSet<string> AllowedColumns { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    }
}
