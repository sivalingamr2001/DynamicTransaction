using System.Data;
using DynamicTransaction.Interfaces;

namespace DynamicTransaction.Services;

public sealed class AsyncDbConnectionWrapper(IDbConnection connection) : IAsyncDbConnectionWrapper
{
    public IDbConnection Connection { get; } = connection ?? throw new ArgumentNullException(nameof(connection));

    public void Dispose()
    {
        Connection.Dispose();
    }

    public async ValueTask DisposeAsync()
    {
        if (Connection is IAsyncDisposable asyncDisposable)
        {
            await asyncDisposable.DisposeAsync();
        }
        else
        {
            Connection.Dispose();
        }
    }
}
