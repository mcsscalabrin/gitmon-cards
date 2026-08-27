// EXERCÍCIO 4, parte B - PROPS COMO OBJETO + CHILDREN
// Modelo: CardDinamico.jsx
// props sempre será um objeto; props.children traz os filhos.

function CardAviso(props) {
    return (
        <div className="card">
            <h3>{props.titulo}</h3>
            <p>{props.mensagem}</p>
            <div>{props.children}</div>
        </div>
    );
}

export default CardAviso;
