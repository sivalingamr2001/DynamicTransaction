using System.Reflection.Metadata;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace Server.Infrastructure.Queries;

public class AuthQueries
{
    /// <summary>
    /// Retrieves the assigned Region and SubRegion for a specific user after successful authentication.
    /// </summary>
    public const string GetRegionDetailsAfterLogin = @"
            SELECT 
                TER_NAME AS Region, 
                DR_REGION AS SubRegion 
            FROM jan_bms_login_v 
            WHERE UNAME = :Uname AND PWD = :Password";

    /// <summary>
    /// Retrieves a unique list of all available Regions and SubRegions within the system.
    /// </summary>
    public const string GetAllRegionDetails = @"
            SELECT DISTINCT
                TER_NAME AS Region, 
                DR_REGION AS SubRegion 
            FROM jan_bms_login_v";

    public const string GetCustomersNoFilterBySearch = @"
    SELECT DISTINCT
        ra.customer_id,
        ra.customer_name,
        (SELECT customer_category FROM jan_pick_forward_control WHERE bill_to_customer_id = ra.customer_id AND ROWNUM = 1) customer_category
    FROM
        ra_customers ra
        INNER JOIN ra_addresses_all ad ON ra.customer_id = ad.customer_id
        INNER JOIN ra_site_uses_all ras ON
            ad.address_id = ras.address_id
        AND
            ras.site_use_code = 'BILL_TO'
        INNER JOIN ra_territories rt ON ras.territory_id = rt.territory_id
    WHERE 
        LOWER(ra.customer_name) LIKE '%' || LOWER(:searchTerm) || '%'";

    public const string GetCustomerNameByRegionAndSearch = @"
SELECT DISTINCT
    customer_id,
    customer_name,
    region
FROM
    (
        SELECT
            ra.customer_id,
            ra.customer_name,
            (
                SELECT segment14 FROM ra_territories WHERE territory_id = ras.territory_id
            ) region
        FROM
            ra_customers ra,
            ra_addresses_all ad,
            ra_site_uses_all ras
        WHERE
                ra.customer_id = ad.customer_id
            AND
                ad.address_id = ras.address_id
            AND
                ras.site_use_code = 'BILL_TO'
    )
WHERE
    LOWER(customer_name) LIKE '%' || LOWER(:searchTerm) || '%'
    AND region IN :region -- Dapper expands this automatically into (:region1, :region2...)
ORDER BY customer_name ASC";
}
