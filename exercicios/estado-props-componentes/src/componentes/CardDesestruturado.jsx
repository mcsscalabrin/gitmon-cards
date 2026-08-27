// MODELO DA AULA - conceito: PROPS DESESTRUTURADAS
// Em vez de receber props e ler props.titulo, já abrimos o objeto
// direto na assinatura da função: Componente({ a, b, c }).

function CardDesestruturado({ titulo, texto }) {
    return (
        <div className="card">
            <h3>{titulo}</h3>
            <p>{texto}</p>
        </div>
    );
}

export default CardDesestruturado;
