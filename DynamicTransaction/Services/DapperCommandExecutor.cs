using Dapper;
using DynamicTransaction.Interfaces;
using DynamicTransaction.Infrastructure;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace DynamicTransaction.Services;

/// <summary>
/// Production-ready implementation of IDapperCommandExecutor.
/// Provides low-level INSERT, UPDATE, DELETE execution using Dapper command mappings.
/// </summary>
public sealed class DapperCommandExecutor : IDapperCommandExecutor
{
    private readonly IDbConnectionFactory _factory;
    private readonly ILogger<DapperCommandExecutor> _logger;

    public DapperCommandExecutor(IDbConnectionFactory factory, ILogger<DapperCommandExecutor> logger)
    {
        _factory = factory ?? throw new ArgumentNullException(nameof(factory));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <inheritdoc/>
    public async Task<int> ExecuteAsync(
        string sql,
        object? parameters = null,
        IDbTransaction? transaction = null,
        string? connectionString = null,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(sql);

        _logger.LogDebug("DapperCommandExecutor.ExecuteAsync START SQL: {Sql}", sql);
        var redactedParams = SafeLogExtensions.RedactObject(parameters);
        _logger.LogInformation("DapperCommandExecutor.ExecuteAsync START. Parameters: {Parameters}", redactedParams);
        var sw = System.Diagnostics.Stopwatch.StartNew();
        LogParameters(parameters);

        try
        {
            if (transaction is not null)
            {
                var cmd = BuildCommand(sql, parameters, transaction, cancellationToken);
                var result = await transaction.Connection!
                    .ExecuteAsync(cmd).ConfigureAwait(false);

                _logger.LogInformation("DapperCommandExecutor.ExecuteAsync SUCCESS. OperationType: WRITE, RowsAffected: {RowsAffected}, DurationMs: {DurationMs}, Success: true", result, sw.ElapsedMilliseconds);
                return result;
            }

            await using var connWrapper = await OpenAsync(connectionString, cancellationToken).ConfigureAwait(false);
            var command = BuildCommand(sql, parameters, null, cancellationToken);
            var affected = await connWrapper.Connection.ExecuteAsync(command).ConfigureAwait(false);

            _logger.LogInformation("DapperCommandExecutor.ExecuteAsync SUCCESS. OperationType: WRITE, RowsAffected: {RowsAffected}, DurationMs: {DurationMs}, Success: true", affected, sw.ElapsedMilliseconds);
            return affected;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "DapperCommandExecutor.ExecuteAsync ERROR. OperationType: WRITE, DurationMs: {DurationMs}, Success: false, ErrorMessage: {ErrorMessage}",
                sw.ElapsedMilliseconds, ex.Message);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<T?> ExecuteScalarAsync<T>(
        string sql,
        object? parameters = null,
        IDbTransaction? transaction = null,
        string? connectionString = null,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(sql);

        _logger.LogDebug("DapperCommandExecutor.ExecuteScalarAsync START SQL: {Sql}", sql);
        var redactedParams = SafeLogExtensions.RedactObject(parameters);
        _logger.LogInformation("DapperCommandExecutor.ExecuteScalarAsync START. Parameters: {Parameters}", redactedParams);
        var sw = System.Diagnostics.Stopwatch.StartNew();
        LogParameters(parameters);

        try
        {
            if (transaction is not null)
            {
                var cmd = BuildCommand(sql, parameters, transaction, cancellationToken);
                var result = await transaction.Connection!
                    .ExecuteScalarAsync<T>(cmd).ConfigureAwait(false);

                _logger.LogInformation("DapperCommandExecutor.ExecuteScalarAsync SUCCESS. OperationType: WRITE (SCALAR), RowsAffected: 1, DurationMs: {DurationMs}, Success: true", sw.ElapsedMilliseconds);
                return result;
            }

            await using var connWrapper = await OpenAsync(connectionString, cancellationToken).ConfigureAwait(false);
            var command = BuildCommand(sql, parameters, null, cancellationToken);
            var scalar = await connWrapper.Connection.ExecuteScalarAsync<T>(command).ConfigureAwait(false);

            _logger.LogInformation("DapperCommandExecutor.ExecuteScalarAsync SUCCESS. OperationType: WRITE (SCALAR), RowsAffected: 1, DurationMs: {DurationMs}, Success: true", sw.ElapsedMilliseconds);
            return scalar;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "DapperCommandExecutor.ExecuteScalarAsync ERROR. OperationType: WRITE (SCALAR), DurationMs: {DurationMs}, Success: false, ErrorMessage: {ErrorMessage}",
                sw.ElapsedMilliseconds, ex.Message);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<int> ExecuteInTransactionAsync(
        Func<IDbTransaction, Task<int>> work,
        IsolationLevel isolationLevel = IsolationLevel.ReadCommitted,
        string? connectionString = null,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(work);

        _logger.LogDebug("DapperCommandExecutor.ExecuteInTransactionAsync START IsolationLevel: {Level}", isolationLevel);
        var sw = System.Diagnostics.Stopwatch.StartNew();

        await using var connWrapper = await OpenAsync(connectionString, cancellationToken).ConfigureAwait(false);
        using var tx = connWrapper.Connection.BeginTransaction(isolationLevel);
        try
        {
            var affectedRows = await work(tx).ConfigureAwait(false);
            tx.Commit();

            _logger.LogInformation("DapperCommandExecutor.ExecuteInTransactionAsync COMMITTED {Elapsed}ms", sw.ElapsedMilliseconds);
            return affectedRows;
        }
        catch (Exception ex)
        {
            tx.Rollback();
            _logger.LogError(ex, "DapperCommandExecutor.ExecuteInTransactionAsync ROLLED BACK {Elapsed}ms", sw.ElapsedMilliseconds);
            throw;
        }
    }

    private async Task<IAsyncDbConnectionWrapper> OpenAsync(string? connectionString, CancellationToken cancellationToken)
    {
        var connectionWrapper = _factory.CreateConnection(connectionString);

        if (connectionWrapper.Connection.State != ConnectionState.Open)
        {
            if (connectionWrapper.Connection is System.Data.Common.DbConnection commonConn)
            {
                await commonConn.OpenAsync(cancellationToken).ConfigureAwait(false);
            }
            else
            {
                connectionWrapper.Connection.Open();
            }
        }
        return connectionWrapper;
    }

    private void LogParameters(object? parameters)
    {
        if (parameters == null || !_logger.IsEnabled(LogLevel.Debug)) return;

        try
        {
            var loggedParams = new List<string>();
            IEnumerable<string> paramNames;
            Func<string, object?> getValue;

            if (parameters is OracleDynamicParameters odp)
            {
                paramNames = odp.ParameterNames;
                getValue = name => odp.GetValue(name);
            }
            else if (parameters is IDictionary<string, object?> dict)
            {
                paramNames = dict.Keys;
                getValue = name => dict[name];
            }
            else
            {
                var props = parameters.GetType().GetProperties();
                paramNames = props.Select(p => p.Name);
                getValue = name => parameters.GetType().GetProperty(name)?.GetValue(parameters);
            }

            // Sensitive fields blocklist for redacting
            var sensitiveKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "password", "pwd", "token", "secret", "cvv", "ssn", "creditcard", "pin", "auth", "key"
            };

            foreach (var name in paramNames)
            {
                var rawValue = getValue(name);
                string printedValue;

                if (rawValue == null || rawValue == DBNull.Value)
                {
                    printedValue = "NULL";
                }
                else if (sensitiveKeys.Any(k => name.Contains(k, StringComparison.OrdinalIgnoreCase)))
                {
                    printedValue = "[REDACTED]";
                }
                else
                {
                    var valStr = rawValue.ToString() ?? string.Empty;
                    if (valStr.Length > 100)
                    {
                        printedValue = valStr.Substring(0, 100) + "... (truncated)";
                    }
                    else
                    {
                        printedValue = valStr;
                    }
                }

                loggedParams.Add($"{name}={printedValue}");
            }

            _logger.LogDebug("DapperCommandExecutor Parameters: {Params}", string.Join(", ", loggedParams));
        }
        catch (Exception ex)
        {
            _logger.LogTrace(ex, "Failed to inspect parameters for debugging logs.");
        }
    }

    private static CommandDefinition BuildCommand(
        string sql,
        object? parameters,
        IDbTransaction? transaction,
        CancellationToken cancellationToken)
    {
        object? finalParams = parameters;
        if (parameters != null && !(parameters is OracleDynamicParameters))
        {
            var oracleParams = new OracleDynamicParameters();
            if (parameters is IDictionary<string, object?> dict)
            {
                foreach (var kvp in dict)
                {
                    oracleParams.Add(kvp.Key, kvp.Value);
                }
            }
            else if (parameters is IDictionary<string, object> dictNonNullable)
            {
                foreach (var kvp in dictNonNullable)
                {
                    oracleParams.Add(kvp.Key, kvp.Value);
                }
            }
            else
            {
                foreach (var prop in parameters.GetType().GetProperties())
                {
                    oracleParams.Add(prop.Name, prop.GetValue(parameters));
                }
            }
            finalParams = oracleParams;
        }

        return new CommandDefinition(
            sql,
            parameters: finalParams,
            transaction: transaction,
            cancellationToken: cancellationToken);
    }
}
