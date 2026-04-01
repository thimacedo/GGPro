Set WshShell = CreateObject("WScript.Shell")
' Executa o arquivo .bat em modo invisivel (0)
' "True" no final faz o script esperar o termino (opcional, aqui omitido)
WshShell.Run chr(34) & "INICIAR_SISTEMA_FUT_PRO.bat" & Chr(34), 0
Set WshShell = Nothing
