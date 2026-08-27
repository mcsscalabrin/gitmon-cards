// MODELO DA AULA - conceito: COMPONENTE
// Um componente é uma função que retorna JSX e é exportada com export default.

function MeuComponente() {
    return (
        <div className="card">
            <h3>Meu primeiro componente</h3>
            <p>Sou uma função comum que devolve JSX.</p>
        </div>
    );
}

export default MeuComponente;
