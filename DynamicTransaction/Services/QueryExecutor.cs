using DynamicTransaction.Interfaces;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System.Data;
using System.Text.RegularExpressions;

namespace DynamicTransaction.Services;

public class QueryExecutor : IQueryExecutor
{
    /// <summary>
    /// Executes an Oracle SELECT query asynchronously and returns rows as a JSON JArray.
    /// </summary>
    public async Task<JArray> ExecuteQueryWithParametersAsync(
        IDbConnection connection,
        string query,
        JObject parameters,
        IDbTransaction? transaction = null)
    {
        var results = new JArray();

        // 1. Ensure connection is open
        if (connection.State == ConnectionState.Closed)
        {
            if (connection is System.Data.Common.DbConnection dbConn)
            {
                await dbConn.OpenAsync();
            }
            else
            {
                connection.Open();
            }
        }

        // 2. Prepare the command and convert tokens to Oracle syntax (:{Key})
        string oracleQuery = ReplaceParametersInQuery(query, parameters);
        using var command = connection.CreateCommand();
        command.CommandText = oracleQuery;

        if (transaction != null)
        {
            command.Transaction = transaction;
        }

        AddTypedParameters(command, parameters);

        // 3. Optimize for Managed Oracle client if applicable
        if (command.GetType().FullName == "Oracle.ManagedDataAccess.Client.OracleCommand")
        {
            dynamic oracleCommand = command;
            using var reader = await oracleCommand.ExecuteReaderAsync();
            while (await reader.ReadAsync())
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

        return results;
    }

    /// <summary>
    /// Wraps a query into a subquery block and returns the total matching count.
    /// </summary>
    public async Task<int> GetTotalCountAsync(
        IDbConnection connection,
        string baseQuery,
        JObject parameters,
        IDbTransaction? transaction = null)
    {
        var countQuery = ExtractCountQuery(baseQuery);

        if (connection.State == ConnectionState.Closed)
        {
            if (connection is System.Data.Common.DbConnection dbConn)
            {
                await dbConn.OpenAsync();
            }
            else
            {
                connection.Open();
            }
        }

        string oracleCountQuery = ReplaceParametersInQuery(countQuery, parameters);
        using var command = connection.CreateCommand();
        command.CommandText = oracleCountQuery;

        if (transaction != null)
        {
            command.Transaction = transaction;
        }

        AddTypedParameters(command, parameters);

        if (command.GetType().FullName == "Oracle.ManagedDataAccess.Client.OracleCommand")
        {
            dynamic oracleCommand = command;
            return Convert.ToInt32(await oracleCommand.ExecuteScalarAsync());
        }

        return Convert.ToInt32(command.ExecuteScalar());
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
