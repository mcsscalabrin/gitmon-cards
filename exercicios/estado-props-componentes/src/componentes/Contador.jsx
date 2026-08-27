// MODELO DA AULA - conceito: ESTADO
// useState devolve o par getter/setter. Uma variável comum
// (let contador = 0) até mudaria de valor, mas o React não ficaria
// sabendo e a tela NÃO seria redesenhada. Quem avisa o React é o setter.

import { useState } from "react";

function Contador() {
    const [contador, setContador] = useState(0);

    function incrementar() {
        setContador(contador + 1);
    }

    return (
        <div className="card">
            <p>Contador: {contador}</p>
            <button onClick={incrementar}>Incrementar</button>
        </div>
    );
}

export default Contador;
