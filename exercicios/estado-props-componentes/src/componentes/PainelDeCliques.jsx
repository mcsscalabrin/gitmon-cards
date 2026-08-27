import { useState } from "react";

function PainelDeCliques() {
    const [cliquesAzuis, setCliquesAzuis] = useState(0);
    const [cliquesVermelhos, setCliquesVermelhos] = useState(0);

    function somarAzul() {
        setCliquesAzuis(cliquesAzuis + 1);
    }

    function somarVermelho() {
        setCliquesVermelhos(cliquesVermelhos + 1);
    }

    return (
        <div>
            <p>Cliques azuis: {cliquesAzuis}</p>
            <p>Cliques vermelhos: {cliquesVermelhos}</p>
            <button onClick={somarAzul}>Azul +</button>
            <button onClick={somarVermelho}>Vermelho +</button>
        </div>
    );
}

export default PainelDeCliques;
