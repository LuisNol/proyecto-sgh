async function consultarCita() {
  const dni = document.getElementById('dni').value;
  const fechaNacimiento = document.getElementById('fecha_nacimiento').value;
  const resultado = document.getElementById('resultado');

  if (!dni || !fechaNacimiento) {
    resultado.innerHTML = '<p class="error">❌ Completa todos los campos</p>';
    return;
  }

  try {
    const res = await fetch(`/citas?dni=${dni}&fecha_nacimiento=${fechaNacimiento}`);
    const data = await res.json();

    if (res.status === 404) {
      resultado.innerHTML = '<p class="error">❌ No se encontró ninguna cita con esos datos</p>';
      return;
    }

    resultado.innerHTML = `
      <p>✅ Cita encontrada:</p>
      <ul>
        <li><strong>Fecha:</strong> ${data[0].fecha_cita}</li>
        <li><strong>Consultorio:</strong> ${data[0].consultorio}</li>
        <li><strong>Prescriptor:</strong> ${data[0].prescriptor}</li>
        <li><strong>Turno:</strong> ${data[0].turno}</li>
        <li><strong>N° Cupo:</strong> ${data[0].numero_cupo}</li>
      </ul>
    `;
  } catch (error) {
    console.error(error);
    resultado.innerHTML = '<p class="error">❌ Error al conectar con el servidor</p>';
  }
}
