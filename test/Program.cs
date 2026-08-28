#nullable disable
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using DynamicTransaction.Interfaces;
using DynamicTransaction.Models;
using DynamicTransaction.Services;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json.Linq;

namespace TestApp;

class Program
{
    static async Task<int> Main(string[] args)
    {
        Console.WriteLine("==================================================");
        Console.WriteLine("STARTING DATABASE TRANSACTION EXECUTION LAYER TESTS");
        Console.WriteLine("==================================================");

        var testRunner = new TestRunner();
        bool allPassed = await testRunner.RunTestsAsync();

        Console.WriteLine("==================================================");
        if (allPassed)
        {
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine("ALL TEST CASES PASSED SUCCESSFULLY!");
            Console.ResetColor();
            return 0;
        }
        else
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("SOME TEST CASES FAILED.");
            Console.ResetColor();
            return 1;
        }
    }
}

public sealed class TestRunner
{
    private readonly MockDapperCommandExecutor _mockExecutor;
    private readonly MockLogger<TransactionCommandService> _mockLogger;
    private readonly TransactionCommandService _service;

    public TestRunner()
    {
        _mockExecutor = new MockDapperCommandExecutor();
        _mockLogger = new MockLogger<TransactionCommandService>();
        _service = new TransactionCommandService(_mockExecutor, _mockLogger);
    }

    public async Task<bool> RunTestsAsync()
    {
        bool allPassed = true;

        // Test 1: Unknown Transaction Name Rejected
        allPassed &= await AssertTestCase("Unknown TransactionName", async () =>
        {
            var req = new TransactionCommandRequest
            {
                TransactionName = "UnknownTx",
                MainProps = new JObject { ["STATUS"] = "Active" }
            };
            var res = await _service.ExecuteTransactionAsync(req);
            return !res.Success && res.Message.Contains("Unknown or unauthorized TransactionName") && res.ErrorType == "NotFound";
        });

        // Test 2: Unknown mainProps Column Rejected
        allPassed &= await AssertTestCase("Unknown mainProps Column", async () =>
        {
            var req = new TransactionCommandRequest
            {
                TransactionName = "SalesPlan",
                MainProps = new JObject { ["INVALID_COL"] = "Val" }
            };
            var res = await _service.ExecuteTransactionAsync(req);
            return !res.Success && res.Message.Contains("Unknown column 'INVALID_COL' in main table") && res.ErrorType == "Validation";
        });

        // Test 3: Unknown childProps Column Rejected
        allPassed &= await AssertTestCase("Unknown childProps Column", async () =>
        {
            var req = new TransactionCommandRequest
            {
                TransactionName = "SalesPlan",
                MainProps = new JObject { ["CUSTOMER_NAME"] = "Test Cust" },
                ChildProps = new JObject
                {
                    ["SalesPlanLine"] = new JArray(new JObject { ["BAD_CHILD_COL"] = 100 })
                }
            };
            var res = await _service.ExecuteTransactionAsync(req);
            return !res.Success && res.Message.Contains("Unknown column 'BAD_CHILD_COL' in child table") && res.ErrorType == "Validation";
        });

        // Test 4: Empty Create Payload Rejected
        allPassed &= await AssertTestCase("Empty Create Payload", async () =>
        {
            var req = new TransactionCommandRequest
            {
                TransactionName = "SalesPlan",
                MainProps = new JObject() // Empty
            };
            var res = await _service.ExecuteTransactionAsync(req);
            return !res.Success && res.Message.Contains("MainProps payload cannot be empty for a Create") && res.ErrorType == "Validation";
        });

        // Test 5: Empty Update Column List Rejected
        allPassed &= await AssertTestCase("Empty Update Column List", async () =>
        {
            var req = new TransactionCommandRequest
            {
                TransactionId = 123,
                TransactionName = "SalesPlan",
                MainProps = new JObject { ["PICK_FORWARD_ID"] = 123 } // Only primary key, no writable columns
            };
            var res = await _service.ExecuteTransactionAsync(req);
            return !res.Success && res.Message.Contains("must contain at least one column to update (excluding the primary key)") && res.ErrorType == "Validation";
        });

        // Test 6: Invalid ChildProps shape rejected (value is not JArray)
        allPassed &= await AssertTestCase("Invalid childProps shape (not array)", async () =>
        {
            var req = new TransactionCommandRequest
            {
                TransactionName = "SalesPlan",
                MainProps = new JObject { ["CUSTOMER_NAME"] = "Test Cust" },
                ChildProps = new JObject
                {
                    ["SalesPlanLine"] = new JObject { ["ITEM_CODE"] = "ITEM1" } // Object instead of Array
                }
            };
            var res = await _service.ExecuteTransactionAsync(req);
            return !res.Success && res.Message.Contains("must be a JSON array") && res.ErrorType == "Validation";
        });

        // Test 6b: Invalid childProps shape rejected (array item is not JObject)
        allPassed &= await AssertTestCase("Invalid childProps shape (array item not object)", async () =>
        {
            var req = new TransactionCommandRequest
            {
                TransactionName = "SalesPlan",
                MainProps = new JObject { ["CUSTOMER_NAME"] = "Test Cust" },
                ChildProps = new JObject
                {
                    ["SalesPlanLine"] = new JArray("PrimitiveString") // Not JObject
                }
            };
            var res = await _service.ExecuteTransactionAsync(req);
            return !res.Success && res.Message.Contains("must be JSON objects") && res.ErrorType == "Validation";
        });

        // Test 7: Delete without Key Rejected
        allPassed &= await AssertTestCase("Delete without Key", async () =>
        {
            var req = new TransactionCommandRequest
            {
                TransactionId = 123, // Set to Update operation
                TransactionName = "SalesPlan",
                DelProps = new JObject
                {
                    ["SalesPlanLine"] = new JArray(new JObject { ["INVALID_KEY_COL"] = 123 }) // Missing LINE_ID
                }
            };
            var res = await _service.ExecuteTransactionAsync(req);
            if (res.Success || !res.Message.Contains("missing key 'LINE_ID'") || res.ErrorType != "Validation")
            {
                Console.WriteLine($"\n   ---> Expected error containing 'missing key \'LINE_ID\'', but got: '{res.Message}' (ErrorType: {res.ErrorType})");
                return false;
            }
            return true;
        });

        // Test 7b: Delete item is null / zero rejected
        allPassed &= await AssertTestCase("Delete item is zero", async () =>
        {
            var req = new TransactionCommandRequest
            {
                TransactionId = 123, // Set to Update operation
                TransactionName = "SalesPlan",
                DelProps = new JObject
                {
                    ["SalesPlanLine"] = new JArray(0) // Zero ID
                }
            };
            var res = await _service.ExecuteTransactionAsync(req);
            if (res.Success || !res.Message.Contains("contains an invalid primary key value") || res.ErrorType != "Validation")
            {
                Console.WriteLine($"\n   ---> Expected error containing 'contains an invalid primary key value', but got: '{res.Message}' (ErrorType: {res.ErrorType})");
                return false;
            }
            return true;
        });

        // Test 8: Sequence-based Create generates ID
        allPassed &= await AssertTestCase("Sequence-based Create generates ID", async () =>
        {
            _mockExecutor.Reset();
            _mockExecutor.MockSequenceNextValue = 999; // Mock pre-fetch sequence

            var req = new TransactionCommandRequest
            {
                TransactionName = "ReplenishmentBin",
                MainProps = new JObject
                {
                    ["BIN_CODE"] = "BIN-XYZ",
                    ["STATUS"] = "Active"
                }
            };
            var res = await _service.ExecuteTransactionAsync(req);

            bool success = res.Success && res.TransactionId == 999 && res.Operation == "Create";
            bool ranSeqQuery = _mockExecutor.ExecutedSqls.Any(sql => sql.Contains("JAN_REPLENISH_BIN_SEQ.NEXTVAL"));
            bool insertedWithId = _mockExecutor.ExecutedSqls.Any(sql => sql.Contains("BIN_ID") && sql.Contains("INSERT INTO JAN_REPLENISH_BIN_TAB"));

            if (!success || !ranSeqQuery || !insertedWithId)
            {
                Console.WriteLine($"\n   ---> Success: {res.Success}, Msg: '{res.Message}', TxId: {res.TransactionId}");
                return false;
            }
            return true;
        });

        // Test 9: Identity-based Create returns generated ID via RETURNING clause
        allPassed &= await AssertTestCase("Identity-based Create generates ID via RETURNING clause", async () =>
        {
            _mockExecutor.Reset();
            _mockExecutor.MockOutputIdentityId = 777L; // Mock RETURNING output

            var req = new TransactionCommandRequest
            {
                TransactionName = "SalesPlan",
                MainProps = new JObject
                {
                    ["CUSTOMER_NAME"] = "Acme Corp",
                    ["STATUS"] = "New"
                }
            };
            var res = await _service.ExecuteTransactionAsync(req);

            bool success = res.Success && res.TransactionId == 777 && res.Operation == "Create";
            bool ranReturningSql = _mockExecutor.ExecutedSqls.Any(sql => sql.Contains("RETURNING PICK_FORWARD_ID INTO :generatedId"));

            if (!success || !ranReturningSql)
            {
                Console.WriteLine($"\n   ---> Success: {res.Success}, Msg: '{res.Message}', TxId: {res.TransactionId}");
                return false;
            }
            return true;
        });

        // Test 10: Child insert receives parent FK
        allPassed &= await AssertTestCase("Child insert receives parent FK", async () =>
        {
            _mockExecutor.Reset();
            _mockExecutor.MockOutputIdentityId = 111L;

            var req = new TransactionCommandRequest
            {
                TransactionName = "SalesPlan",
                MainProps = new JObject
                {
                    ["CUSTOMER_NAME"] = "Child Parent Test"
                },
                ChildProps = new JObject
                {
                    ["SalesPlanLine"] = new JArray(
                        new JObject { ["ITEM_CODE"] = "ITEM-1", ["QUANTITY"] = 5 },
                        new JObject { ["ITEM_CODE"] = "ITEM-2", ["QUANTITY"] = 10 }
                    )
                }
            };
            var res = await _service.ExecuteTransactionAsync(req);

            bool success = res.Success && res.TransactionId == 111;
            
            // Verify child insert SQL was executed twice with reference to parent FK
            var childInserts = _mockExecutor.ExecutedSqls.Where(sql => sql.Contains("INSERT INTO JAN_PICK_FORWARD_LINES")).ToList();
            bool childRefsParentFk = _mockExecutor.ExecutedParameters.Any(p => p.ContainsKey("PICK_FORWARD_ID") && Convert.ToInt64(p["PICK_FORWARD_ID"]) == 111);

            if (!success || childInserts.Count != 2 || !childRefsParentFk)
            {
                Console.WriteLine($"\n   ---> Success: {res.Success}, Msg: '{res.Message}', TxId: {res.TransactionId}, ChildInserts: {childInserts.Count}, FK Refs parent: {childRefsParentFk}");
                return false;
            }
            return true;
        });

        // Test 11: Transaction rolls back when child insert fails
        allPassed &= await AssertTestCase("Transaction rolls back when child insert fails", async () =>
        {
            _mockExecutor.Reset();
            _mockExecutor.MockOutputIdentityId = 222L;
            _mockExecutor.SqlToFail = "INSERT INTO JAN_PICK_FORWARD_LINES"; // Cause fail during child insert

            var req = new TransactionCommandRequest
            {
                TransactionName = "SalesPlan",
                MainProps = new JObject
                {
                    ["CUSTOMER_NAME"] = "Fail Test"
                },
                ChildProps = new JObject
                {
                    ["SalesPlanLine"] = new JArray(new JObject { ["ITEM_CODE"] = "ITEM-FAIL" })
                }
            };
            var res = await _service.ExecuteTransactionAsync(req);

            bool rollbackLogged = _mockLogger.LoggedErrors.Any(err => err.Contains("TransactionCommandService.ExecuteTransactionAsync ERROR"));
            return !res.Success && _mockExecutor.WasRollbackCalled && rollbackLogged && res.Message.Contains("Database operation failed") && res.ErrorType == "Database";
        });

        // Test 12: Oracle generated ID conversion from decimal
        allPassed &= await AssertTestCase("Oracle ID Conversion from decimal", async () =>
        {
            _mockExecutor.Reset();
            _mockExecutor.MockOutputIdentityId = 123.45M; // Decimal type returned by Oracle Number

            var req = new TransactionCommandRequest
            {
                TransactionName = "SalesPlan",
                MainProps = new JObject { ["CUSTOMER_NAME"] = "Dec Test" }
            };
            var res = await _service.ExecuteTransactionAsync(req);
            return res.Success && res.TransactionId == 123;
        });

        // Test 12b: Oracle generated ID conversion from int
        allPassed &= await AssertTestCase("Oracle ID Conversion from int", async () =>
        {
            _mockExecutor.Reset();
            _mockExecutor.MockOutputIdentityId = 456; // Int type

            var req = new TransactionCommandRequest
            {
                TransactionName = "SalesPlan",
                MainProps = new JObject { ["CUSTOMER_NAME"] = "Int Test" }
            };
            var res = await _service.ExecuteTransactionAsync(req);
            return res.Success && res.TransactionId == 456;
        });

        // Test 12c: Oracle generated ID conversion from string numeric
        allPassed &= await AssertTestCase("Oracle ID Conversion from string", async () =>
        {
            _mockExecutor.Reset();
            _mockExecutor.MockOutputIdentityId = "789"; // String numeric

            var req = new TransactionCommandRequest
            {
                TransactionName = "SalesPlan",
                MainProps = new JObject { ["CUSTOMER_NAME"] = "Str Test" }
            };
            var res = await _service.ExecuteTransactionAsync(req);
            return res.Success && res.TransactionId == 789;
        });

        // Test 13: QueryExecutor rejects UPDATE/INSERT/DELETE/MERGE/PLSQL
        allPassed &= await AssertTestCase("QueryExecutor rejects write queries", async () =>
        {
            var queryExecutor = new QueryExecutor(new MockLogger<QueryExecutor>());
            var mockConn = new MockDbConnection();
            var paramsObj = new JObject();

            string[] writeQueries = new[]
            {
                "UPDATE users SET role = 'admin'",
                "INSERT INTO audit_log (detail) VALUES ('test')",
                "DELETE FROM log WHERE id = 1",
                "MERGE INTO target USING source ON (1=1) WHEN MATCHED THEN UPDATE SET col = 1",
                "TRUNCATE TABLE logs",
                "DROP TABLE users",
                "BEGIN dbms_output.put_line('hello'); END;",
                "SELECT * FROM users; DROP TABLE users" // Multi-statement
            };

            foreach (var q in writeQueries)
            {
                try
                {
                    await queryExecutor.ExecuteQueryWithParametersAsync(mockConn, q, paramsObj);
                    Console.WriteLine($"\n   ---> Failed to reject query: '{q}'");
                    return false;
                }
                catch (InvalidOperationException ex) when (ex.Message.Contains("Unauthorized query execution"))
                {
                    // Correctly rejected
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"\n   ---> Unexpected exception for '{q}': {ex.Message}");
                    return false;
                }
            }
            return true;
        });

        // Test 14: QueryExecutor allows valid SELECT and WITH SELECT queries
        allPassed &= await AssertTestCase("QueryExecutor allows SELECT and WITH SELECT", async () =>
        {
            var queryExecutor = new QueryExecutor(new MockLogger<QueryExecutor>());
            var mockConn = new MockDbConnection();
            var paramsObj = new JObject();

            string[] readQueries = new[]
            {
                "SELECT * FROM users",
                "SELECT id, name FROM customers WHERE id = :id",
                "WITH UserCTE AS (SELECT id FROM users) SELECT * FROM UserCTE"
            };

            foreach (var q in readQueries)
            {
                try
                {
                    // Since connection is closed and mock connection doesn't open,
                    // we expect it to try to open or execute. If it throws connection or dynamic execution exception
                    // but NOT "Unauthorized query execution", it means it passed the SELECT check!
                    await queryExecutor.ExecuteQueryWithParametersAsync(mockConn, q, paramsObj);
                }
                catch (InvalidOperationException ex) when (ex.Message.Contains("Unauthorized query execution"))
                {
                    Console.WriteLine($"\n   ---> Wrongly rejected SELECT query: '{q}'");
                    return false;
                }
                catch (Exception)
                {
                    // Any other database/mock connection exception is fine (means SELECT check passed)
                }
            }
            return true;
        });

        // Test 15: Cancellation token flows to executor
        allPassed &= await AssertTestCase("Cancellation token flow", async () =>
        {
            var cts = new CancellationTokenSource();
            await cts.CancelAsync(); // Pre-cancel

            var req = new TransactionCommandRequest
            {
                TransactionName = "SalesPlan",
                MainProps = new JObject { ["CUSTOMER_NAME"] = "Cancel Test" }
            };

            try
            {
                await _service.ExecuteTransactionAsync(req, cts.Token);
                return false;
            }
            catch (OperationCanceledException)
            {
                return true; // Correctly canceled
            }
            catch (Exception ex)
            {
                // In DapperCommandExecutor.ExecuteInTransactionAsync, OpenAsync accepts cancellationToken,
                // which will throw OperationCanceledException or bubble it up wrapped inside internal DB failures.
                if (ex.InnerException is OperationCanceledException || ex.Message.Contains("canceled"))
                {
                    return true;
                }
                Console.WriteLine($"\n   ---> Unexpected exception in cancellation test: {ex.Message}");
                return false;
            }
        });

        // Test 16: Controller HTTP Status code mapping
        allPassed &= await AssertTestCase("Controller HTTP Status Mapping", async () =>
        {
            var mockController = new Server.Controllers.TransactionController(_service);
            
            // 16a. Validation Failure -> HTTP 400 BadRequest
            var req400 = new TransactionCommandRequest
            {
                TransactionName = "SalesPlan",
                MainProps = new JObject { ["INVALID_COLUMN"] = "Test" }
            };
            var res400 = await mockController.Execute(req400, CancellationToken.None) as Microsoft.AspNetCore.Mvc.BadRequestObjectResult;
            bool ok400 = res400 != null && res400.StatusCode == 400;

            // 16b. Unknown TransactionName Mapping -> HTTP 404 NotFound
            var req404 = new TransactionCommandRequest
            {
                TransactionName = "UnknownTxName",
                MainProps = new JObject { ["STATUS"] = "Active" }
            };
            var res404 = await mockController.Execute(req404, CancellationToken.None) as Microsoft.AspNetCore.Mvc.NotFoundObjectResult;
            bool ok404 = res404 != null && res404.StatusCode == 404;

            // 16c. Database Failure -> HTTP 500 InternalServerError
            _mockExecutor.Reset();
            _mockExecutor.SqlToFail = "INSERT INTO JAN_PICK_FORWARD_CONTROL"; // Force DB Exception
            var req500 = new TransactionCommandRequest
            {
                TransactionName = "SalesPlan",
                MainProps = new JObject { ["CUSTOMER_NAME"] = "Force DB Fail" }
            };
            var res500 = await mockController.Execute(req500, CancellationToken.None) as Microsoft.AspNetCore.Mvc.ObjectResult;
            bool ok500 = res500 != null && res500.StatusCode == 500;

            if (!ok400 || !ok404 || !ok500)
            {
                Console.WriteLine($"\n   ---> Status checks failed: 400={ok400}, 404={ok404}, 500={ok500}");
                return false;
            }
            return true;
        });

        return allPassed;
    }

    private async Task<bool> AssertTestCase(string testName, Func<Task<bool>> action)
    {
        Console.Write($"Running: {testName,-60}");
        try
        {
            // Reset mock logger
            _mockLogger.LoggedErrors.Clear();
            bool passed = await action();
            if (passed)
            {
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine("[PASSED]");
                Console.ResetColor();
                return true;
            }
            else
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("[FAILED]");
                Console.ResetColor();
                if (_mockLogger.LoggedErrors.Count > 0)
                {
                    Console.WriteLine($"   Mock Logger Error: {_mockLogger.LoggedErrors[0]}");
                }
                return false;
            }
        }
        catch (Exception ex)
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine($"[ERROR: {ex.Message}]");
            Console.ResetColor();
            return false;
        }
    }
}

public class MockDapperCommandExecutor : IDapperCommandExecutor
{
    public List<string> ExecutedSqls { get; } = new();
    public List<Dictionary<string, object?>> ExecutedParameters { get; } = new();
    public object MockSequenceNextValue { get; set; } = 1;
    public object MockOutputIdentityId { get; set; } = 1;
    public string? SqlToFail { get; set; }
    public bool WasRollbackCalled { get; set; }

    public void Reset()
    {
        ExecutedSqls.Clear();
        ExecutedParameters.Clear();
        MockSequenceNextValue = 1;
        MockOutputIdentityId = 1;
        SqlToFail = null;
        WasRollbackCalled = false;
    }

    public Task<int> ExecuteAsync(
        string sql,
        object? parameters = null,
        IDbTransaction? transaction = null,
        string? connectionString = null,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        ExecutedSqls.Add(sql);

        var paramDict = new Dictionary<string, object?>();
        if (parameters is OracleDynamicParameters odp)
        {
            foreach (var name in odp.ParameterNames)
            {
                paramDict[name] = odp.GetValue(name);
            }
        }
        else if (parameters is IDictionary<string, object?> dict)
        {
            foreach (var kvp in dict)
            {
                paramDict[kvp.Key] = kvp.Value;
            }
        }
        ExecutedParameters.Add(paramDict);

        if (SqlToFail != null && sql.Contains(SqlToFail))
        {
            throw new Exception("Mock database constraint failure!");
        }

        if (sql.Contains("RETURNING") && parameters is OracleDynamicParameters oracleParams)
        {
            oracleParams.Add("generatedId", MockOutputIdentityId);
        }

        return Task.FromResult(1);
    }

    public Task<T?> ExecuteScalarAsync<T>(
        string sql,
        object? parameters = null,
        IDbTransaction? transaction = null,
        string? connectionString = null,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        ExecutedSqls.Add(sql);

        if (SqlToFail != null && sql.Contains(SqlToFail))
        {
            throw new Exception("Mock database constraint failure!");
        }

        if (sql.Contains("NEXTVAL"))
        {
            return Task.FromResult((T?)(object)MockSequenceNextValue);
        }

        return Task.FromResult(default(T));
    }

    public async Task<int> ExecuteInTransactionAsync(
        Func<IDbTransaction, Task<int>> work,
        IsolationLevel isolationLevel = IsolationLevel.ReadCommitted,
        string? connectionString = null,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var mockTx = new MockDbTransaction(this);
        try
        {
            return await work(mockTx);
        }
        catch (Exception)
        {
            mockTx.Rollback();
            throw;
        }
    }
}

public class MockDbTransaction : IDbTransaction
{
    private readonly MockDapperCommandExecutor _executor;
    public IDbConnection? Connection => null;
    public IsolationLevel IsolationLevel => IsolationLevel.ReadCommitted;

    public MockDbTransaction(MockDapperCommandExecutor executor)
    {
        _executor = executor;
    }

    public void Commit() { }
    public void Rollback()
    {
        _executor.WasRollbackCalled = true;
    }
    public void Dispose() { }
}

public class MockLogger<T> : ILogger<T>
{
    public List<string> LoggedErrors { get; } = new();

    public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

    public bool IsEnabled(LogLevel logLevel) => true;

    public void Log<TState>(
        LogLevel logLevel,
        EventId eventId,
        TState state,
        Exception? exception,
        Func<TState, Exception?, string> formatter)
    {
        string msg = formatter(state, exception);
        if (logLevel == LogLevel.Error)
        {
            LoggedErrors.Add(msg);
        }
    }
}

// ── Mock DbConnection Framework classes to test QueryExecutor without real DB ──────────────────────────────────

public class MockDbConnection : System.Data.Common.DbConnection
{
    public override string ConnectionString { get; set; } = "";
    public override string Database => "";
    public override string DataSource => "";
    public override string ServerVersion => "";
    public override ConnectionState State => ConnectionState.Closed;

    public override void ChangeDatabase(string databaseName) { }
    public override void Close() { }
    public override void Open() { }

    protected override System.Data.Common.DbTransaction BeginDbTransaction(IsolationLevel isolationLevel)
    {
        throw new NotImplementedException();
    }

    protected override System.Data.Common.DbCommand CreateDbCommand()
    {
        return new MockDbCommand();
    }
}

public class MockDbCommand : System.Data.Common.DbCommand
{
    public override string CommandText { get; set; } = "";
    public override int CommandTimeout { get; set; }
    public override CommandType CommandType { get; set; }
    public override bool DesignTimeVisible { get; set; }
    public override UpdateRowSource UpdatedRowSource { get; set; }
    protected override System.Data.Common.DbConnection? DbConnection { get; set; }
    protected override System.Data.Common.DbParameterCollection DbParameterCollection => new MockDbParameterCollection();
    protected override System.Data.Common.DbTransaction? DbTransaction { get; set; }

    public override void Cancel() { }
    public override int ExecuteNonQuery() => 0;
    public override object? ExecuteScalar() => null;
    public override void Prepare() { }

    protected override System.Data.Common.DbParameter CreateDbParameter()
    {
        return new MockDbParameter();
    }

    protected override System.Data.Common.DbDataReader ExecuteDbDataReader(CommandBehavior behavior)
    {
        return new MockDbDataReader();
    }
}

public class MockDbParameter : System.Data.Common.DbParameter
{
    public override DbType DbType { get; set; }
    public override ParameterDirection Direction { get; set; }
    public override bool IsNullable { get; set; }
    public override string ParameterName { get; set; } = "";
    public override int Size { get; set; }
    public override string SourceColumn { get; set; } = "";
    public override bool SourceColumnNullMapping { get; set; }
    public override object? Value { get; set; }
    public override void ResetDbType() { }
}

public class MockDbParameterCollection : System.Data.Common.DbParameterCollection
{
    private readonly List<object> _list = new();
    public override int Count => _list.Count;
    public override object SyncRoot => null!;
    public override int Add(object value) { _list.Add(value); return _list.Count - 1; }
    public override void Clear() => _list.Clear();
    public override bool Contains(object value) => _list.Contains(value);
    public override int IndexOf(object value) => _list.IndexOf(value);
    public override void Insert(int index, object value) => _list.Insert(index, value);
    public override void Remove(object value) => _list.Remove(value);
    public override void RemoveAt(int index) => _list.RemoveAt(index);
    protected override System.Data.Common.DbParameter GetParameter(int index) => (System.Data.Common.DbParameter)_list[index];
    protected override System.Data.Common.DbParameter GetParameter(string parameterName) => throw new NotImplementedException();
    protected override void SetParameter(int index, System.Data.Common.DbParameter value) => _list[index] = value;
    protected override void SetParameter(string parameterName, System.Data.Common.DbParameter value) => throw new NotImplementedException();
    public override void CopyTo(Array array, int index) => throw new NotImplementedException();
    public override System.Collections.IEnumerator GetEnumerator() => _list.GetEnumerator();
    public override bool Contains(string value) => false;
    public override int IndexOf(string parameterName) => -1;
    public override void RemoveAt(string parameterName) { }
    public override void AddRange(Array values)
    {
        foreach (var val in values)
        {
            Add(val);
        }
    }
}

public class MockDbDataReader : System.Data.Common.DbDataReader
{
    public override int Depth => 0;
    public override int FieldCount => 0;
    public override bool HasRows => false;
    public override bool IsClosed => false;
    public override int RecordsAffected => 0;
    public override object this[int ordinal] => null!;
    public override object this[string name] => null!;

    public override bool GetBoolean(int ordinal) => false;
    public override byte GetByte(int ordinal) => 0;
    public override long GetBytes(int ordinal, long dataOffset, byte[]? buffer, int bufferOffset, int length) => 0;
    public override char GetChar(int ordinal) => ' ';
    public override long GetChars(int ordinal, long dataOffset, char[]? buffer, int bufferOffset, int length) => 0;
    public override string GetDataTypeName(int ordinal) => "";
    public override DateTime GetDateTime(int ordinal) => DateTime.MinValue;
    public override decimal GetDecimal(int ordinal) => 0;
    public override double GetDouble(int ordinal) => 0;
    public override Type GetFieldType(int ordinal) => typeof(object);
    public override float GetFloat(int ordinal) => 0;
    public override Guid GetGuid(int ordinal) => Guid.Empty;
    public override short GetInt16(int ordinal) => 0;
    public override int GetInt32(int ordinal) => 0;
    public override long GetInt64(int ordinal) => 0;
    public override string GetString(int ordinal) => "";
    public override object GetValue(int ordinal) => null!;
    public override int GetValues(object[] values) => 0;
    public override bool IsDBNull(int ordinal) => true;
    public override bool NextResult() => false;
    public override bool Read() => false;
    public override string GetName(int ordinal) => "";
    public override int GetOrdinal(string name) => -1;
    public override System.Collections.IEnumerator GetEnumerator() => Array.Empty<object>().GetEnumerator();
}
