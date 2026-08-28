using System;
using System.Data;
using System.Threading;
using System.Threading.Tasks;

namespace DynamicTransaction.Interfaces;

/// <summary>
/// Low-level database command executor specifically for write operations (INSERT, UPDATE, DELETE).
/// Uses Dapper for connection management, logging, and asynchronous execution.
/// </summary>
public interface IDapperCommandExecutor
{
    /// <summary>
    /// Executes a non-query SQL command (INSERT, UPDATE, DELETE) and returns the number of rows affected.
    /// </summary>
    Task<int> ExecuteAsync(
        string sql,
        object? parameters = null,
        IDbTransaction? transaction = null,
        string? connectionString = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Executes a query that returns a single scalar value.
    /// </summary>
    Task<T?> ExecuteScalarAsync<T>(
        string sql,
        object? parameters = null,
        IDbTransaction? transaction = null,
        string? connectionString = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Starts a transaction and executes the provided delegate, committing on success and rolling back on error.
    /// </summary>
    Task<int> ExecuteInTransactionAsync(
        Func<IDbTransaction, Task<int>> work,
        IsolationLevel isolationLevel = IsolationLevel.ReadCommitted,
        string? connectionString = null,
        CancellationToken cancellationToken = default);
}
