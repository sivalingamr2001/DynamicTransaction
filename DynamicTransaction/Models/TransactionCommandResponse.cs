namespace DynamicTransaction.Models;

/// <summary>
/// Data Transfer Object representing the result of a transaction command execution.
/// </summary>
public sealed class TransactionCommandResponse
{
    /// <summary>
    /// Indicates whether the entire transaction executed successfully.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// The ID of the main record (newly created or updated).
    /// </summary>
    public long TransactionId { get; set; }

    /// <summary>
    /// The total number of rows affected by the operation.
    /// </summary>
    public int RowsAffected { get; set; }

    /// <summary>
    /// The action performed, e.g. "Create", "Update", "Delete".
    /// </summary>
    public string Operation { get; set; } = string.Empty;

    /// <summary>
    /// Optional status message or error details.
    /// </summary>
    public string? Message { get; set; }

    /// <summary>
    /// Classification of error: "None", "Validation", "NotFound", "Database".
    /// Used by API controllers to determine appropriate HTTP status codes (200, 400, 404, 500).
    /// </summary>
    public string ErrorType { get; set; } = "None";
}
