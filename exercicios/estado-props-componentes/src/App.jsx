import ContadorCompleto from "./componentes/ContadorCompleto";
import Saudador from "./componentes/Saudador";
import PainelDeCliques from "./componentes/PainelDeCliques";
import CardProduto from "./componentes/CardProduto";
import CardAviso from "./componentes/CardAviso";
import CartaoPerfil from "./componentes/CartaoPerfil";

function App() {
    return (
        <div className="pagina">
            <h1>Estado, Props e Componentes</h1>

            <section>
                <h2>Exercício 1 — Contador completo</h2>
                {/* Duas cópias: cada <ContadorCompleto /> chama useState por
                    dentro, então cada uma tem a SUA própria caixa de estado.
                    Clicar em uma não mexe na outra. */}
                <ContadorCompleto />
                <ContadorCompleto />
            </section>

            <section>
                <h2>Exercício 2 — O Saudador</h2>
                <Saudador />
            </section>

            <section>
                <h2>Exercício 3 — Um componente, vários estados</h2>
                <PainelDeCliques />
            </section>

            <section>
                <h2>Exercício 4 — Cards sob medida</h2>
                <CardProduto nome="Teclado mecânico" preco="349,90" />
                <CardProduto nome="Mouse sem fio" preco="129,90" />
                <CardProduto nome="Monitor 27 polegadas" preco="1499,00" />

                <CardAviso
                    titulo="Atenção"
                    mensagem="A entrega pode atrasar em feriados."
                >
                    <h4>Quer acompanhar o pedido?</h4>
                    <button>Rastrear</button>
                </CardAviso>
            </section>

            <section>
                <h2>Exercício 5 — Cartão de perfil</h2>
                <CartaoPerfil nome="João" curso="2SISA" />
                <CartaoPerfil nome="Matheus" curso="2SISA" />
            </section>
        </div>
    );
}

export default App;
