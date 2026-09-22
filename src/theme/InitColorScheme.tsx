"use client";

import { getInitColorSchemeScript } from "@mui/material/styles";

/**
 * O script que aplica o esquema salvo antes da hidratação, embrulhado.
 *
 * `getInitColorSchemeScript` é uma função de cliente no MUI: chamá-la direto
 * do layout — que agora renderiza no servidor — derruba o build. Como todo
 * client component também é renderizado no HTML inicial, o `<script>` sai no
 * documento do mesmo jeito e continua rodando antes da hidratação, que é o
 * que impede a página de piscar no tema claro antes de trocar para o escuro.
 */
const InitColorScheme = () => <>{getInitColorSchemeScript()}</>;

export default InitColorScheme;
