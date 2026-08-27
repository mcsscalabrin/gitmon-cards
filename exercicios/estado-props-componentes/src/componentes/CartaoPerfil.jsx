// EXERCÍCIO 5 - PROPS + ESTADO juntos
// O que não muda (nome, curso) vem por props.
// O que muda ao interagir (curtidas) vive no estado.

import { useState } from "react";

function CartaoPerfil({ nome, curso }) {
    const [curtidas, setCurtidas] = useState(0);

    function curtir() {
        setCurtidas(curtidas + 1);
    }

    return (
        <div className="card">
            <h3>{nome}</h3>
            <p>Curso: {curso}</p>
            <p>Curtidas: {curtidas}</p>
            <button onClick={curtir}>Curtir</button>
        </div>
    );
}

export default CartaoPerfil;
