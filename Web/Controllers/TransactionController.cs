using DynamicTransaction.Interfaces;
using DynamicTransaction.Models;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Server.Controllers;

/// <summary>
/// Exposes API endpoints to execute orchestrated CRUD database transactions.
/// </summary>
[ApiController]
[Route("api/transaction")]
public sealed class TransactionController(
    ITransactionCommandService transactionService) : ControllerBase
{
    private readonly ITransactionCommandService _transactionService = transactionService ?? throw new ArgumentNullException(nameof(transactionService));

    /// <summary>
    /// Executes a transaction including deletions, insertions, and updates for parent and child entities.
    /// </summary>
    /// <param name="request">The transaction request payload.</param>
    /// <param name="cancellationToken">Propagates cancellation signals.</param>
    [HttpPost("execute")]
    public async Task<IActionResult> Execute(
        [FromBody] TransactionCommandRequest request,
        CancellationToken cancellationToken)
    {
        if (request == null)
        {
            return BadRequest(new TransactionCommandResponse
            {
                Success = false,
                Message = "Request body cannot be null."
            });
        }

        if (string.IsNullOrWhiteSpace(request.TransactionName))
        {
            return BadRequest(new TransactionCommandResponse
            {
                Success = false,
                Message = "TransactionName is a required field."
            });
        }

        var response = await _transactionService.ExecuteTransactionAsync(request, cancellationToken);

        if (!response.Success)
        {
            return response.ErrorType switch
            {
                "NotFound" => NotFound(response),
                "Database" => StatusCode(500, response),
                _ => BadRequest(response)
            };
        }

        return Ok(response);
    }
}
