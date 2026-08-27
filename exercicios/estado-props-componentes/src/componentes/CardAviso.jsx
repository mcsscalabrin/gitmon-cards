function CardAviso(props) {
    return (
        <div>
            <h3>{props.titulo}</h3>
            <p>{props.mensagem}</p>
            <div>{props.children}</div>
        </div>
    );
}

export default CardAviso;
