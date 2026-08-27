// EXERCÍCIO 4, parte A - PROPS DESESTRUTURADAS
// Modelo: CardDesestruturado.jsx
// O nome da prop na chamada precisa ser igual ao nome lido aqui dentro.

function CardProduto({ nome, preco }) {
    return (
        <div className="card">
            <h3>{nome}</h3>
            <p>Preço: R$ {preco}</p>
        </div>
    );
}

export default CardProduto;
