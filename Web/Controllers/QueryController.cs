using DynamicTransaction.Interfaces;
using DynamicTransaction.Models;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json.Linq;

namespace Server.Controllers;

[ApiController]
[Route("api/query")]
public sealed class QueryController(
    IDbConnectionFactory connectionFactory,
    IQueryExecutor queryExecutor) : ControllerBase
{
    private const string QueryDefinitionSql = """
        SELECT QUERY_NUMBER, DESCRIPTION, QUERY_TEXT
        FROM JAN_QUERY_DEFINITION_DEV
        WHERE QUERY_NUMBER = {QueryNumber}
        """;

    [HttpPost("execute")]
    public async Task<IActionResult> Execute(
        [FromBody] FetchConfig request)
    {
        if (request.QueryNumber <= 0)
        {
            return BadRequest("QueryNumber must be greater than zero.");
        }

        await using var connectionWrapper = connectionFactory.CreateConnection();
        var definitionParameters = new JObject
        {
            ["QueryNumber"] = request.QueryNumber
        };

        var definitions = await queryExecutor.ExecuteQueryWithParametersAsync(
            connectionWrapper.Connection,
            QueryDefinitionSql,
            definitionParameters);

        if (definitions.Count == 0)
        {
            return NotFound($"No query definition was found for query number {request.QueryNumber}.");
        }

        var definition = (JObject)definitions[0]!;
        var queryText = GetString(definition, "QUERY_TEXT");
        if (string.IsNullOrWhiteSpace(queryText))
        {
            return Problem("The query definition does not contain query text.");
        }

        var rows = await queryExecutor.ExecuteQueryWithParametersAsync(
            connectionWrapper.Connection,
            queryText,
            request.InputParameters ?? new JObject());

        return Ok(new
        {
            QueryNumber = request.QueryNumber,
            Description = GetString(definition, "DESCRIPTION"),
            Data = rows
        });
    }

    private static string? GetString(JObject value, string propertyName)
    {
        var property = value.Properties()
            .FirstOrDefault(item => string.Equals(item.Name, propertyName, StringComparison.OrdinalIgnoreCase));

        return property?.Value.Type == JTokenType.Null ? null : property?.Value.Value<string>();
    }
}
