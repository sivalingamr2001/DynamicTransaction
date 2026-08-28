using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;

namespace DynamicTransaction.Infrastructure;

/// <summary>
/// Provides secure parameter payload redaction and structured object sanitization before logging.
/// </summary>
public static class SafeLogExtensions
{
    private static readonly HashSet<string> SensitiveKeys = new(StringComparer.OrdinalIgnoreCase)
    {
        "password", "pwd", "token", "secret", "authorization", "auth", "key", "email", "phone", "mobile"
    };

    /// <summary>
    /// Traverses and redacts sensitive property values in a JObject.
    /// </summary>
    public static JObject RedactParameters(JObject? original)
    {
        if (original == null) return new JObject();

        var result = new JObject();
        foreach (var property in original.Properties())
        {
            if (SensitiveKeys.Any(k => property.Name.Contains(k, StringComparison.OrdinalIgnoreCase)))
            {
                result[property.Name] = "[REDACTED]";
            }
            else if (property.Value.Type == JTokenType.Object)
            {
                result[property.Name] = RedactParameters((JObject)property.Value);
            }
            else if (property.Value.Type == JTokenType.Array)
            {
                var array = (JArray)property.Value;
                var redactedArray = new JArray();
                foreach (var item in array)
                {
                    if (item.Type == JTokenType.Object)
                    {
                        redactedArray.Add(RedactParameters((JObject)item));
                    }
                    else
                    {
                        redactedArray.Add(item);
                    }
                }
                result[property.Name] = redactedArray;
            }
            else
            {
                result[property.Name] = property.Value;
            }
        }
        return result;
    }

    /// <summary>
    /// Converts a generic parameters object (anonymous type, dict, JObject) into a redacted structured JObject representation.
    /// </summary>
    public static object RedactObject(object? parameters)
    {
        if (parameters == null) return new JObject();

        if (parameters is JObject jobj)
        {
            return RedactParameters(jobj);
        }

        if (parameters is IDictionary<string, object?> dict)
        {
            var converted = new JObject();
            foreach (var kvp in dict)
            {
                converted[kvp.Key] = kvp.Value == null ? JValue.CreateNull() : JToken.FromObject(kvp.Value);
            }
            return RedactParameters(converted);
        }

        try
        {
            var jObj = JObject.FromObject(parameters);
            return RedactParameters(jObj);
        }
        catch
        {
            return new JObject { ["Info"] = "[Unable to serialize parameters]" };
        }
    }
}
