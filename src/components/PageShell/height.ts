/**
 * Altura da navbar, num módulo próprio para que a própria Navbar possa usá-la
 * sem importar o PageShell — que importa a Navbar de volta.
 *
 * As telas descontam esse valor da altura da janela para o conteúdo ocupar a
 * tela inteira mesmo quando é curto, e o aside do episódio usa o mesmo número
 * para se fixar logo abaixo do cabeçalho. A Navbar aplica isso como `height`
 * fixa, então o número é garantido, e não uma suposição.
 */
export const NAVBAR_HEIGHT = 108;
