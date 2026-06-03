using System.Security.Cryptography;
using System.Text;

namespace FinanceControl.Web.Helpers;

public static class PasswordHelper
{
    public static string Hash(string senha)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(senha));
        return Convert.ToBase64String(bytes);
    }

    public static bool Verify(string senha, string hash) =>
        Hash(senha) == hash;
}
