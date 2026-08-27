// EXERCÍCIO 1 - Contador completo (ESTADO)
// Modelo: Contador.jsx

import { useState } from "react";

function ContadorCompleto() {
    // O estado é a "caixa" que o React observa.
    // useState(0) devolve o par: contador (getter) e setContador (setter).
    const [contador, setContador] = useState(0);

    function incrementar() {
        setContador(contador + 1);
    }

    function decrementar() {
        setContador(contador - 1);
    }

    function zerar() {
        setContador(0);
    }

    return (
        <div className="card">
            <p>Contador: {contador}</p>
            <button onClick={incrementar}>Incrementar</button>
            <button onClick={decrementar}>Decrementar</button>
            <button onClick={zerar}>Zerar</button>
        </div>
    );
}

export default ContadorCompleto;
