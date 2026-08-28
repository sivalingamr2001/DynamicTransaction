using Newtonsoft.Json.Linq;

namespace DynamicTransaction.Models;

/// <summary>
/// Data Transfer Object representing a request to execute a CRUD transaction with parent and child tables.
/// </summary>
public sealed class TransactionCommandRequest
{
    /// <summary>
    /// ID of the main transaction record. If null or 0, a new main record is created (INSERT).
    /// If greater than 0, the existing record is updated (UPDATE).
    /// </summary>
    public long? TransactionId { get; set; }

    /// <summary>
    /// The logical transaction name mapping to server-side metadata constraints.
    /// </summary>
    public string TransactionName { get; set; } = string.Empty;

    /// <summary>
    /// Key-value properties representing fields to insert/update in the main table.
    /// </summary>
    public JObject? MainProps { get; set; }

    /// <summary>
    /// Group of child table properties where key is ChildName/TableName and value is an array of child rows.
    /// </summary>
    public JObject? ChildProps { get; set; }

    /// <summary>
    /// Records or child records to delete.
    /// </summary>
    public JObject? DelProps { get; set; }
}
