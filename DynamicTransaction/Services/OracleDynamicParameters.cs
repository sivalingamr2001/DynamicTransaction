using Dapper;
using System.Data;

namespace DynamicTransaction.Services;

/// <summary>
/// A custom Dapper dynamic parameters container that intercepts command parameter binding
/// and explicitly forces BindByName = true when targeting Managed Oracle commands.
/// This guarantees named Oracle bind parameters (:paramName) match keys correctly instead of by position.
/// </summary>
public sealed class OracleDynamicParameters : SqlMapper.IDynamicParameters
{
    private readonly DynamicParameters _dynamicParameters = new();

    /// <summary>
    /// Adds a parameter to the underlying parameter collection.
    /// </summary>
    public void Add(string name, object? value = null, DbType? dbType = null, ParameterDirection? direction = null, int? size = null)
    {
        _dynamicParameters.Add(name, value, dbType, direction, size);
    }

    /// <summary>
    /// Gets the value of a parameter.
    /// </summary>
    public T Get<T>(string name)
    {
        return _dynamicParameters.Get<T>(name);
    }

    /// <summary>
    /// Binds parameters to the raw ADO.NET IDbCommand and sets BindByName = true on OracleCommand.
    /// </summary>
    public void AddParameters(IDbCommand command, SqlMapper.Identity identity)
    {
        if (command.GetType().FullName == "Oracle.ManagedDataAccess.Client.OracleCommand")
        {
            dynamic oracleCommand = command;
            oracleCommand.BindByName = true;
        }

        ((SqlMapper.IDynamicParameters)_dynamicParameters).AddParameters(command, identity);
    }

    /// <summary>
    /// Exposes parameter names for logging and testing.
    /// </summary>
    public IEnumerable<string> ParameterNames => _dynamicParameters.ParameterNames;

    /// <summary>
    /// Exposes dynamic parameter retrieval by name.
    /// </summary>
    public object? GetValue(string name) => _dynamicParameters.Get<object>(name);
}
