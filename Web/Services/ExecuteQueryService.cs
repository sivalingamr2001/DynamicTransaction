using DynamicTransaction.Interfaces;
using Newtonsoft.Json.Linq;
using System.Data;
using Server.Interfaces;

namespace Server.Services;

public class ExecuteQueryService(IQueryExecutor queryExecutor) : IExecuteQuery
{
    private readonly IQueryExecutor _queryExecutor = queryExecutor;

    public Task<JArray> ExecuteQueryWithParametersAsync(
        IDbConnection connection,
        string query,
        JObject parameters,
        IDbTransaction? transaction = null,
        CancellationToken cancellationToken = default)
    {
        return _queryExecutor.ExecuteQueryWithParametersAsync(connection, query, parameters, transaction, cancellationToken);
    }

    public Task<int> GetTotalCountAsync(
        IDbConnection connection,
        string baseQuery,
        JObject parameters,
        IDbTransaction? transaction = null,
        CancellationToken cancellationToken = default)
    {
        return _queryExecutor.GetTotalCountAsync(connection, baseQuery, parameters, transaction, cancellationToken);
    }
}
