import { useState } from "react";

function ContadorCompleto() {
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
        <div>
            <p>Contador: {contador}</p>
            <button onClick={incrementar}>Incrementar</button>
            <button onClick={decrementar}>Decrementar</button>
            <button onClick={zerar}>Zerar</button>
        </div>
    );
}

export default ContadorCompleto;
