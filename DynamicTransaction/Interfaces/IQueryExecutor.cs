using Newtonsoft.Json.Linq;
using System.Data;

namespace DynamicTransaction.Interfaces;

public interface IQueryExecutor
{
    Task<JArray> ExecuteQueryWithParametersAsync(
        IDbConnection connection,
        string query,
        JObject parameters,
        IDbTransaction? transaction = null);

    Task<int> GetTotalCountAsync(
        IDbConnection connection,
        string baseQuery,
        JObject parameters,
        IDbTransaction? transaction = null);
}
    