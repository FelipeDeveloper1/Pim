using System.ComponentModel.DataAnnotations;

namespace FinanceControl.Web.DTOs;

public class LoginDto
{
    [Required(ErrorMessage = "Informe o login")]
    [Display(Name = "Login")]
    public string NomeUsuario { get; set; } = string.Empty;

    [Required(ErrorMessage = "Informe a senha")]
    [DataType(DataType.Password)]
    [Display(Name = "Senha")]
    public string Senha { get; set; } = string.Empty;
}

public class RegistroDto
{
    [Required, StringLength(120)]
    [Display(Name = "Nome completo")]
    public string NomeCompleto { get; set; } = string.Empty;

    [Required, StringLength(60)]
    [Display(Name = "Usuário")]
    public string NomeUsuario { get; set; } = string.Empty;

    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required, DataType(DataType.Password), StringLength(100, MinimumLength = 6)]
    public string Senha { get; set; } = string.Empty;

    [Required, DataType(DataType.Password), Compare(nameof(Senha))]
    [Display(Name = "Confirmar senha")]
    public string ConfirmarSenha { get; set; } = string.Empty;
}
