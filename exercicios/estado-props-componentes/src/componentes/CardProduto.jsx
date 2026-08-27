function CardProduto({ nome, preco }) {
    return (
        <div>
            <h3>{nome}</h3>
            <p>Preço: R$ {preco}</p>
        </div>
    );
}

export default CardProduto;
