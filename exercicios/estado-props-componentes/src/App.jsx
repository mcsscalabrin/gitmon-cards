import ContadorCompleto from "./componentes/ContadorCompleto";
import Saudador from "./componentes/Saudador";
import PainelDeCliques from "./componentes/PainelDeCliques";
import CardProduto from "./componentes/CardProduto";
import CardAviso from "./componentes/CardAviso";
import CartaoPerfil from "./componentes/CartaoPerfil";

function App() {
    return (
        <div>
            <ContadorCompleto />
            <ContadorCompleto />

            <Saudador />

            <PainelDeCliques />

            <CardProduto nome="Teclado" preco="120,00" />
            <CardProduto nome="Mouse" preco="80,00" />
            <CardProduto nome="Monitor" preco="900,00" />

            <CardAviso titulo="Atenção" mensagem="A entrega pode atrasar em feriados.">
                <h4>Quer acompanhar o pedido?</h4>
                <button>Rastrear</button>
            </CardAviso>

            <CartaoPerfil nome="João" curso="2SISA" />
        </div>
    );
}

export default App;
