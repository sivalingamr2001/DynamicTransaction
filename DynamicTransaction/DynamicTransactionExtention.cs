using DynamicTransaction.Interfaces;
using DynamicTransaction.Services;
using Microsoft.Extensions.DependencyInjection;

namespace DynamicTransaction;

public static class DynamicTransactionExtension
{
    public static IServiceCollection AddDynamicTransaction(
        this IServiceCollection services,
        string defaultConnectionString)
    {
        services.AddSingleton<IDbConnectionFactory>(_ =>
            new DbConnectionFactory(defaultConnectionString));

        services.AddScoped<IQueryExecutor, QueryExecutor>();
        services.AddScoped<IDynamicQueryExecutor, DynamicQueryExecutor>();

        return services;
    }

    public static IServiceCollection AddDynamicTransaction<TFactory, TExecutor>(
        this IServiceCollection services)
        where TFactory : class, IDbConnectionFactory
        where TExecutor : class, IQueryExecutor
    {
        services.AddScoped<IQueryExecutor, TExecutor>();
        services.AddSingleton<IDbConnectionFactory, TFactory>();

        return services;
    }
}
