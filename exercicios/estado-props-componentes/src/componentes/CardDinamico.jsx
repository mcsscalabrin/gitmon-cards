// MODELO DA AULA - conceito: PROPS (objeto inteiro + children)
// props sempre chega como um OBJETO. A prop children traz o que foi
// escrito entre a abertura e o fechamento da tag do componente.

function CardDinamico(props) {
    return (
        <div className="card">
            <h3>{props.titulo}</h3>
            <p>{props.texto}</p>
            <div>{props.children}</div>
        </div>
    );
}

export default CardDinamico;
