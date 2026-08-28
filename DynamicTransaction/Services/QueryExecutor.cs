using DynamicTransaction.Interfaces;
using DynamicTransaction.Infrastructure;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Data;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;

namespace DynamicTransaction.Services;

/// <summary>
/// Service implementation of IQueryExecutor.
/// Provides safe read-only SELECT database executions and rejects modifying keywords (writes) or PL/SQL execution blocks.
/// </summary>
public class QueryExecutor(ILogger<QueryExecutor> logger) : IQueryExecutor
{
    private readonly ILogger<QueryExecutor> _logger = logger ?? throw new ArgumentNullException(nameof(logger));

    /// <inheritdoc/>
    public async Task<JArray> ExecuteQueryWithParametersAsync(
        IDbConnection connection,
        string query,
        JObject parameters,
        IDbTransaction? transaction = null,
        CancellationToken cancellationToken = default)
    {
        var sw = System.Diagnostics.Stopwatch.StartNew();
        var redactedParams = SafeLogExtensions.RedactParameters(parameters);

        _logger.LogDebug("QueryExecutor.ExecuteQueryWithParametersAsync START. SQL: {Sql}", query);
        _logger.LogInformation("QueryExecutor.ExecuteQueryWithParametersAsync START. Parameters: {Parameters}", redactedParams);

        try
        {
            // 1. SELECT-only validation
            ValidateIsSafeSelectQuery(query);

            var results = new JArray();

            // 2. Ensure connection is open
            if (connection.State == ConnectionState.Closed)
            {
                if (connection is System.Data.Common.DbConnection dbConn)
                {
                    await dbConn.OpenAsync(cancellationToken).ConfigureAwait(false);
                }
                else
                {
                    connection.Open();
                }
            }

            // 3. Prepare the command and convert tokens to Oracle syntax (:{Key})
            var expandedParameters = ExpandCollectionParameters(query, parameters, out var expandedQuery);
            string oracleQuery = ReplaceParametersInQuery(expandedQuery, expandedParameters);
            using var command = connection.CreateCommand();
            command.CommandText = oracleQuery;

            if (transaction != null)
            {
                command.Transaction = transaction;
            }

            AddTypedParameters(command, expandedParameters);

            // 4. Optimize for Managed Oracle client if applicable
            if (command.GetType().FullName == "Oracle.ManagedDataAccess.Client.OracleCommand")
            {
                dynamic oracleCommand = command;
                using var reader = await oracleCommand.ExecuteReaderAsync(cancellationToken).ConfigureAwait(false);
                while (await reader.ReadAsync(cancellationToken).ConfigureAwait(false))
                {
                    AddCurrentRow(reader, results);
                }
            }
            else
            {
                using var reader = command.ExecuteReader();
                while (reader.Read())
                {
                    AddCurrentRow(reader, results);
                }
            }

            _logger.LogInformation("QueryExecutor.ExecuteQueryWithParametersAsync SUCCESS. OperationType: SELECT, RowsReturned: {RowsReturned}, DurationMs: {DurationMs}, Success: true",
                results.Count, sw.ElapsedMilliseconds);

            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "QueryExecutor.ExecuteQueryWithParametersAsync ERROR. OperationType: SELECT, DurationMs: {DurationMs}, Success: false, ErrorMessage: {ErrorMessage}",
                sw.ElapsedMilliseconds, ex.Message);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<int> GetTotalCountAsync(
        IDbConnection connection,
        string baseQuery,
        JObject parameters,
        IDbTransaction? transaction = null,
        CancellationToken cancellationToken = default)
    {
        var sw = System.Diagnostics.Stopwatch.StartNew();
        var redactedParams = SafeLogExtensions.RedactParameters(parameters);

        _logger.LogDebug("QueryExecutor.GetTotalCountAsync START. SQL: {Sql}", baseQuery);
        _logger.LogInformation("QueryExecutor.GetTotalCountAsync START. Parameters: {Parameters}", redactedParams);

        try
        {
            // 1. SELECT-only validation
            ValidateIsSafeSelectQuery(baseQuery);

            var countQuery = ExtractCountQuery(baseQuery);

            if (connection.State == ConnectionState.Closed)
            {
                if (connection is System.Data.Common.DbConnection dbConn)
                {
                    await dbConn.OpenAsync(cancellationToken).ConfigureAwait(false);
                }
                else
                {
                    connection.Open();
                }
            }

            var expandedParameters = ExpandCollectionParameters(countQuery, parameters, out var expandedCountQuery);
            string oracleCountQuery = ReplaceParametersInQuery(expandedCountQuery, expandedParameters);
            using var command = connection.CreateCommand();
            command.CommandText = oracleCountQuery;

            if (transaction != null)
            {
                command.Transaction = transaction;
            }

            AddTypedParameters(command, expandedParameters);

            int count;
            if (command.GetType().FullName == "Oracle.ManagedDataAccess.Client.OracleCommand")
            {
                dynamic oracleCommand = command;
                count = Convert.ToInt32(await oracleCommand.ExecuteScalarAsync(cancellationToken).ConfigureAwait(false));
            }
            else
            {
                count = Convert.ToInt32(command.ExecuteScalar());
            }

            _logger.LogInformation("QueryExecutor.GetTotalCountAsync SUCCESS. OperationType: SELECT (COUNT), RowsReturned: 1, DurationMs: {DurationMs}, Success: true",
                sw.ElapsedMilliseconds);

            return count;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "QueryExecutor.GetTotalCountAsync ERROR. OperationType: SELECT (COUNT), DurationMs: {DurationMs}, Success: false, ErrorMessage: {ErrorMessage}",
                sw.ElapsedMilliseconds, ex.Message);
            throw;
        }
    }

    // ── Safe SELECT protection validations ───────────────────────────────────────────────────────────────────

    private static void ValidateIsSafeSelectQuery(string sql)
    {
        if (string.IsNullOrWhiteSpace(sql))
        {
            throw new ArgumentException("SQL query text cannot be null or empty.");
        }

        var normalizedSql = sql.Trim().ToUpperInvariant();

        // 1. Must start with SELECT or WITH
        if (!normalizedSql.StartsWith("SELECT") && !normalizedSql.StartsWith("WITH"))
        {
            throw new InvalidOperationException("Unauthorized query execution: Only SELECT or WITH CTE SELECT statements are allowed.");
        }

        // 2. Reject multi-statement query (semicolons outside comments)
        var cleanedSql = RemoveSqlComments(normalizedSql);
        if (cleanedSql.Contains(";"))
        {
            var parts = cleanedSql.Split(';');
            var nonCommentsParts = parts.Skip(1).Where(p => !string.IsNullOrWhiteSpace(p)).ToList();
            if (nonCommentsParts.Any())
            {
                throw new InvalidOperationException("Unauthorized query execution: Multi-statement queries are strictly prohibited.");
            }
        }

        // 3. Reject forbidden DML/DDL keywords
        // Tokenize by punctuation/symbols to find exact blocklisted word tokens (to avoid false-positive sub-matches)
        string[] forbiddenKeywords = new[]
        {
            "INSERT", "UPDATE", "DELETE", "MERGE", "TRUNCATE", "DROP", "ALTER", "CREATE", 
            "EXEC", "EXECUTE", "BEGIN", "DECLARE", "REPLACE", "GRANT", "REVOKE"
        };

        var words = cleanedSql.Split(new[] { ' ', '\r', '\n', '\t', ',', '(', ')', ';', '=', '<', '>', '+', '-', '*', '/' }, StringSplitOptions.RemoveEmptyEntries);
        foreach (var word in words)
        {
            if (forbiddenKeywords.Contains(word))
            {
                throw new InvalidOperationException($"Unauthorized query execution: SQL command contains forbidden statement keyword '{word}'.");
            }
        }
    }

    private static string RemoveSqlComments(string sql)
    {
        // Strip single-line comments (-- comment)
        var lineCommentsRegex = new Regex(@"--.*", RegexOptions.None);
        var noLineComments = lineCommentsRegex.Replace(sql, "");

        // Strip multi-line comments (/* comment */)
        var multiLineCommentsRegex = new Regex(@"/\*.*?\*/", RegexOptions.Singleline);
        return multiLineCommentsRegex.Replace(noLineComments, "");
    }

    private static void AddCurrentRow(IDataReader reader, JArray results)
    {
        var row = new JObject();

        for (var index = 0; index < reader.FieldCount; index++)
        {
            var fieldValue = reader.IsDBNull(index) ? null : reader.GetValue(index);
            row[reader.GetName(index)] = JToken.FromObject(fieldValue ?? string.Empty);
        }

        results.Add(row);
    }

    private static string ExtractCountQuery(string originalQuery)
    {
        var queryWithoutOrderBy = Regex.Replace(originalQuery, @"\s+ORDER\s+BY\s+[^;]*", "", RegexOptions.IgnoreCase);
        return $"SELECT COUNT(*) FROM ({queryWithoutOrderBy}) count_query";
    }

    private static string ReplaceParametersInQuery(string query, JObject parameters)
    {
        foreach (var param in parameters)
        {
            query = query.Replace($"{{{param.Key}}}", $":{param.Key}");
        }

        return query;
    }

    private static JObject ExpandCollectionParameters(
        string query,
        JObject parameters,
        out string expandedQuery)
    {
        var expandedParameters = new JObject();
        expandedQuery = query;

        foreach (var parameter in parameters.Properties())
        {
            if (parameter.Value.Type != JTokenType.Array)
            {
                expandedParameters[parameter.Name] = parameter.Value.DeepClone();
                continue;
            }

            var values = (JArray)parameter.Value;
            var parameterNames = values.Count == 0
                ? new[] { $"{parameter.Name}0" }
                : Enumerable.Range(0, values.Count)
                    .Select(index => $"{parameter.Name}{index}")
                    .ToArray();

            var parameterPattern = $@"(?<![A-Za-z0-9_]):{Regex.Escape(parameter.Name)}\b";
            expandedQuery = Regex.Replace(
                expandedQuery,
                parameterPattern,
                values.Count == 0
                    ? "(NULL)"
                    : $"({string.Join(", ", parameterNames.Select(name => $":{name}"))})",
                RegexOptions.IgnoreCase);

            if (values.Count == 0)
            {
                continue;
            }

            for (var index = 0; index < values.Count; index++)
            {
                expandedParameters[parameterNames[index]] = values[index].DeepClone();
            }
        }

        return expandedParameters;
    }

    private static void AddTypedParameters(IDbCommand command, JObject parameters)
    {
        if (command.GetType().FullName == "Oracle.ManagedDataAccess.Client.OracleCommand")
        {
            dynamic oracleCommand = command;
            oracleCommand.BindByName = true;
        }

        foreach (var param in parameters)
        {
            var dbParam = command.CreateParameter();
            dbParam.ParameterName = $":{param.Key}";
            dbParam.Value = ConvertParameterTokenToDbValue(param.Value);
            command.Parameters.Add(dbParam);
        }
    }

    private static object ConvertParameterTokenToDbValue(JToken? token)
    {
        if (token == null || token.Type is JTokenType.Null or JTokenType.Undefined)
            return DBNull.Value;

        return token.Type switch
        {
            JTokenType.Boolean => token.Value<bool>() ? 1 : 0,
            JTokenType.Integer => ToIntegerValue(token.Value<long>()),
            JTokenType.Float => token.Value<double>(),
            JTokenType.Date => token.Value<DateTime>(),
            JTokenType.Guid => token.Value<Guid>().ToByteArray(),
            JTokenType.String => ToStringOrDateValue(token.Value<string>()),
            _ => token.ToString(Formatting.None)
        };
    }

    private static object ToIntegerValue(long value) =>
        value >= int.MinValue && value <= int.MaxValue ? (int)value : value;

    private static object ToStringOrDateValue(string? value)
    {
        var stringValue = value ?? string.Empty;
        return DateTimeOffset.TryParse(stringValue, out var dateValue) ? dateValue : stringValue;
    }
}
