using Newtonsoft.Json.Linq;

namespace DynamicTransaction.Models;

public class FetchConfig
{
    public int QueryNumber { get; set; }

    public JObject InputParameters { get; set; } = new();

    public int Count { get; set; } = 10;
    public int PageNumber { get; set; } = 1;

    public bool IncludeReferenceLabels { get; set; } = false;

    // Server-side sorting
    public bool EnableServerSideSorting { get; set; } = false;
    public string? SortField { get; set; }
    public string SortDirection { get; set; } = "asc"; // "asc" or "desc"

    // Server-side filtering
    public bool EnableServerSideFiltering { get; set; } = false;
    public List<FilterCondition>? FilterConditions { get; set; }

    // Search text
    public string? SearchText { get; set; }

    // Fetch timezone
    public string? FetchTimezone { get; set; }

    // Direct Query Execution
    public bool EnableDirectQueryExecution { get; set; } = false;
}

public class FilterCondition
{
    public string Field { get; set; } = string.Empty;
    public string Operator { get; set; } = "eq"; // eq, neq, gt, lt, gte, lte, contains, startswith, endswith
    public object? Value { get; set; }
}
