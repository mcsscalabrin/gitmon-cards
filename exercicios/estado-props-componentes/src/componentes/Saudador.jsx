import { useState } from "react";

function Saudador() {
    const [nome, setNome] = useState('Visitante');

    function dizerAnanias() {
        setNome('Ananias');
    }

    function dizerBernardo() {
        setNome('Bernardo');
    }

    function dizerCarlito() {
        setNome('Carlito');
    }

    return (
        <div>
            <p>Olá, {nome}!</p>
            <button onClick={dizerAnanias}>Ananias</button>
            <button onClick={dizerBernardo}>Bernardo</button>
            <button onClick={dizerCarlito}>Carlito</button>
        </div>
    );
}

export default Saudador;
