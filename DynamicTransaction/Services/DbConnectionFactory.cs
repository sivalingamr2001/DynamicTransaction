using System.Data;
using DynamicTransaction.Interfaces;
using Oracle.ManagedDataAccess.Client;

namespace DynamicTransaction.Services;

public sealed class DbConnectionFactory(string defaultConnectionString) : IDbConnectionFactory
{
    private readonly string _defaultConnectionString = defaultConnectionString;

    public IAsyncDbConnectionWrapper CreateConnection(string? connectionStringOverride = null)
    {
        var connectionString = connectionStringOverride ?? _defaultConnectionString;

        IDbConnection connection = new OracleConnection(connectionString);

        return new AsyncDbConnectionWrapper(connection);
    }
}
