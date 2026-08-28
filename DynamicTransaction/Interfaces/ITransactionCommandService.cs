using DynamicTransaction.Models;
using System.Threading;
using System.Threading.Tasks;

namespace DynamicTransaction.Interfaces;

/// <summary>
/// Service contract to orchestrate CRUD transactions (parent and child table insertions, updates, and deletions).
/// </summary>
public interface ITransactionCommandService
{
    /// <summary>
    /// Executes a CRUD command request within a single transaction boundary.
    /// </summary>
    Task<TransactionCommandResponse> ExecuteTransactionAsync(
        TransactionCommandRequest request,
        CancellationToken cancellationToken = default);
}
