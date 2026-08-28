using DynamicTransaction.Interfaces;
using DynamicTransaction.Models;
using DynamicTransaction.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json.Linq;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Server.Controllers;

[ApiController]
[Route("api/query")]
public sealed class QueryController(
    IDbConnectionFactory connectionFactory,
    IQueryExecutor queryExecutor,
    IDapperCommandExecutor dapperCommandExecutor,
    ILogger<QueryController> logger) : ControllerBase
{
    private const string QueryDefinitionSql = """
        SELECT QUERY_NUMBER, DESCRIPTION, QUERY_TEXT
        FROM JAN_QUERY_DEFINITION_DEV
        WHERE QUERY_NUMBER = {QueryNumber}
        """;

    [HttpPost("execute")]
    public async Task<IActionResult> Execute(
        [FromBody] FetchConfig request,
        CancellationToken cancellationToken)
    {
        if (request.QueryNumber <= 0)
        {
            return BadRequest("QueryNumber must be greater than zero.");
        }

        var sw = System.Diagnostics.Stopwatch.StartNew();
        var redactedParams = SafeLogExtensions.RedactParameters(request.InputParameters);

        logger.LogInformation("QueryController.Execute START QueryNumber: {QueryNumber}, Parameters: {Parameters}, Endpoint: {Endpoint}", 
            request.QueryNumber, redactedParams, "/api/query/execute");

        try
        {
            await using var connectionWrapper = connectionFactory.CreateConnection();
            var definitionParameters = new JObject
            {
                ["QueryNumber"] = request.QueryNumber
            };

            var definitions = await queryExecutor.ExecuteQueryWithParametersAsync(
                connectionWrapper.Connection,
                QueryDefinitionSql,
                definitionParameters,
                cancellationToken: cancellationToken);

            if (definitions.Count == 0)
            {
                logger.LogWarning("QueryController.Execute FAILED - QueryNumber {QueryNumber} not found. {Elapsed}ms", request.QueryNumber, sw.ElapsedMilliseconds);
                return NotFound($"No query definition was found for query number {request.QueryNumber}.");
            }

            var definition = (JObject)definitions[0]!;
            var queryText = GetString(definition, "QUERY_TEXT");
            var description = GetString(definition, "DESCRIPTION");

            if (string.IsNullOrWhiteSpace(queryText))
            {
                logger.LogWarning("QueryController.Execute FAILED - QueryNumber {QueryNumber} has no query text. {Elapsed}ms", request.QueryNumber, sw.ElapsedMilliseconds);
                return Problem("The query definition does not contain query text.");
            }

            var rows = await queryExecutor.ExecuteQueryWithParametersAsync(
                connectionWrapper.Connection,
                queryText,
                request.InputParameters ?? new JObject(),
                cancellationToken: cancellationToken);

            logger.LogInformation("QueryController.Execute SUCCESS QueryNumber: {QueryNumber}, Description: {QueryDescription}, OperationType: {OperationType}, RowsReturned: {RowsReturned}, DurationMs: {DurationMs}, Success: {Success}",
                request.QueryNumber, description, "SELECT", rows.Count, sw.ElapsedMilliseconds, true);

            return Ok(new
            {
                QueryNumber = request.QueryNumber,
                Description = description,
                Data = rows
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "QueryController.Execute ERROR QueryNumber: {QueryNumber}, DurationMs: {DurationMs}, Success: {Success}, ErrorMessage: {ErrorMessage}",
                request.QueryNumber, sw.ElapsedMilliseconds, false, ex.Message);
            throw;
        }
    }

    [HttpPost("execute-command")]
    public async Task<IActionResult> ExecuteCommand(
        [FromBody] FetchConfig request,
        CancellationToken cancellationToken)
    {
        if (request.QueryNumber <= 0)
        {
            return BadRequest("QueryNumber must be greater than zero.");
        }

        var sw = System.Diagnostics.Stopwatch.StartNew();
        var redactedParams = SafeLogExtensions.RedactParameters(request.InputParameters);

        logger.LogInformation("QueryController.ExecuteCommand START QueryNumber: {QueryNumber}, Parameters: {Parameters}, Endpoint: {Endpoint}", 
            request.QueryNumber, redactedParams, "/api/query/execute-command");

        try
        {
            await using var connectionWrapper = connectionFactory.CreateConnection();
            var definitionParameters = new JObject
            {
                ["QueryNumber"] = request.QueryNumber
            };

            var definitions = await queryExecutor.ExecuteQueryWithParametersAsync(
                connectionWrapper.Connection,
                QueryDefinitionSql,
                definitionParameters,
                cancellationToken: cancellationToken);

            if (definitions.Count == 0)
            {
                logger.LogWarning("QueryController.ExecuteCommand FAILED - QueryNumber {QueryNumber} not found. {Elapsed}ms", request.QueryNumber, sw.ElapsedMilliseconds);
                return NotFound($"No query definition was found for query number {request.QueryNumber}.");
            }

            var definition = (JObject)definitions[0]!;
            var queryText = GetString(definition, "QUERY_TEXT");
            var description = GetString(definition, "DESCRIPTION");

            if (string.IsNullOrWhiteSpace(queryText))
            {
                logger.LogWarning("QueryController.ExecuteCommand FAILED - QueryNumber {QueryNumber} has no query text. {Elapsed}ms", request.QueryNumber, sw.ElapsedMilliseconds);
                return Problem("The query definition does not contain query text.");
            }

            int rowsAffected = await dapperCommandExecutor.ExecuteAsync(
                queryText,
                request.InputParameters,
                cancellationToken: cancellationToken);

            logger.LogInformation("QueryController.ExecuteCommand SUCCESS QueryNumber: {QueryNumber}, Description: {QueryDescription}, OperationType: {OperationType}, RowsAffected: {RowsAffected}, DurationMs: {DurationMs}, Success: {Success}",
                request.QueryNumber, description, "WRITE", rowsAffected, sw.ElapsedMilliseconds, true);

            return Ok(new
            {
                QueryNumber = request.QueryNumber,
                Description = description,
                RowsAffected = rowsAffected
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "QueryController.ExecuteCommand ERROR QueryNumber: {QueryNumber}, DurationMs: {DurationMs}, Success: {Success}, ErrorMessage: {ErrorMessage}",
                request.QueryNumber, sw.ElapsedMilliseconds, false, ex.Message);
            return StatusCode(500, new { Message = "An error occurred while executing the command.", Details = ex.Message });
        }
    }

    private static string? GetString(JObject value, string propertyName)
    {
        var property = value.Properties()
            .FirstOrDefault(item => string.Equals(item.Name, propertyName, StringComparison.OrdinalIgnoreCase));

        return property?.Value.Type == JTokenType.Null ? null : property?.Value.Value<string>();
    }
}
