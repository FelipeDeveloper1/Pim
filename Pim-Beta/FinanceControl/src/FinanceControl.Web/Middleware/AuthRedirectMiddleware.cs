namespace FinanceControl.Web.Middleware;

public class AuthRedirectMiddleware
{
    private readonly RequestDelegate _next;

    public AuthRedirectMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path.Value?.ToLowerInvariant() ?? "";
        var isPublic = path == "/" ||
                       path.StartsWith("/account") ||
                       path.StartsWith("/css") ||
                       path.StartsWith("/js") ||
                       path.StartsWith("/img") ||
                       path.StartsWith("/lib") ||
                       path.StartsWith("/favicon");

        if (!isPublic && context.User?.Identity?.IsAuthenticated != true)
        {
            context.Response.Redirect("/Account/Login");
            return;
        }

        await _next(context);
    }
}
