// Lógica global del frontend

/* Inicialización de tooltips y popovers.
   Propósito: mostrar ayudas en operadores numéricos u otros elementos.
   Entradas: elementos con data-bs-toggle="tooltip" o data-bs-toggle="popover".
   Salidas: tooltips/popovers visibles.
   Dependencias: Bootstrap 5. */
document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => new bootstrap.Tooltip(el));
document.querySelectorAll('[data-bs-toggle="popover"]').forEach(el => new bootstrap.Popover(el));

/* Popup informativo para operadores numéricos.
   Propósito: avisar cuando se ingresa un número sin operador.
   Entradas: price|stock|min y sus selects asociados.
   Salidas: SweetAlert2 informativo (no bloquea el envío).
   Dependencias: SweetAlert2 y sessionStorage. */
document.querySelectorAll('form[data-search]').forEach(form => {
  form.addEventListener('submit', () => {
    const view = form.getAttribute('data-search');
    const fields = [
      { value: 'price', op: 'priceOp' },
      { value: 'stock', op: 'stockOp' },
      { value: 'min', op: 'minOp' }
    ];
    let shouldAlert = false;
    fields.forEach(f => {
      const val = form.querySelector(`[name="${f.value}"]`).value;
      const op = form.querySelector(`[name="${f.op}"]`).value;
      const key = `swalHint-${view}-${f.value}`; // una vez por vista y campo
      if (val && !op && !sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        shouldAlert = true;
      }
    });
    if (shouldAlert) {
      Swal.fire({
        icon: 'info',
        title: 'Operador por defecto',
        text: "Selecciona operador (=, ≤, ≥). Si no eliges ninguno, se usa '=' por defecto.",
        confirmButtonText: 'Entendido'
      });
    }
  });
});

/* Confirmación de eliminación con SweetAlert2.
   Propósito: evitar borrados accidentales.
   Entradas: click en elementos .btn-delete o [data-action="delete"].
   Salidas: eliminación solo si el usuario confirma.
   Dependencias: SweetAlert2. */
document.addEventListener('click', async e => {
  const btn = e.target.closest('.btn-delete,[data-action="delete"]');
  if (!btn) return; // No es un botón de eliminar
  e.preventDefault();
  const href = btn.getAttribute('href'); // Destino en enlaces
  const form = btn.closest('form');      // O formulario contenedor
  const res = await Swal.fire({
    icon: 'warning',
    title: '¿Estás seguro que quieres eliminarlo?',
    showCancelButton: true,
    confirmButtonText: 'Eliminar',
    cancelButtonText: 'Cancelar'
  });
  if (res.isConfirmed) {
    if (form) form.submit();
    else if (href) window.location.href = href;
  }
});

/* Filtros en vivo para categorías y proveedores.
   Propósito: permitir búsqueda instantánea en checkboxes del formulario de producto.
   Entradas: inputs con data-filter="categorias"/"proveedores" y grids con data-options correspondientes.
   Salidas: muestra/oculta opciones según coincidencia.
   Dependencias: DOM nativo. */
const mkFilter = (inputSelector, gridSelector) => {
  const input = document.querySelector(inputSelector);
  const grid  = document.querySelector(gridSelector);
  if (!input || !grid) return;
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    grid.querySelectorAll('.form-check').forEach(node => {
      const label = node.querySelector('.form-check-label')?.textContent?.toLowerCase() || '';
      node.closest('.col').style.display = label.includes(q) ? '' : 'none';
    });
  });
};
mkFilter('[data-filter="categorias"]',  '[data-options="categorias"]');
mkFilter('[data-filter="proveedores"]', '[data-options="proveedores"]');

// [auth] Toggle mostrar/ocultar contraseña
// Propósito: alternar visibilidad del campo password de forma accesible.
// Entradas: botones data-toggle="password" con data-target.
// Salidas: cambia type, icono e indicadores ARIA.
// Errores: ignora si no existe el input indicado.
document.querySelectorAll('[data-toggle="password"]').forEach((btn) => {
  const input = document.querySelector(btn.dataset.target);
  if (!input) return;
  btn.addEventListener('click', () => {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.setAttribute('aria-pressed', String(show));
    const icon = btn.querySelector('i');
    if (icon) icon.className = show ? 'bx bx-hide' : 'bx bx-show';
    btn.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
  });
});

/* Confirmación de cambio de contraseña.
   Propósito: evitar modificaciones accidentales.
   Entradas: formularios con data-confirm="password".
   Salidas: envía el formulario sólo tras confirmación y marca hidden confirm=yes.
   Dependencias: SweetAlert2. */
document.querySelectorAll('form[data-confirm="password"]').forEach(form => {
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const res = await Swal.fire({
      icon: 'warning',
      title: '¿Seguro que quieres cambiar la contraseña?',
      showCancelButton: true,
      confirmButtonText: 'Sí, cambiar',
      cancelButtonText: 'Cancelar'
    });
    if (res.isConfirmed) {
      const hidden = form.querySelector('input[name="confirm"]');
      if (hidden) hidden.value = 'yes';
      form.submit();
    }
  });
});
// [checklist] Requisito implementado | Validación aplicada | SQL parametrizado (si aplica) | Comentarios modo curso | Sin código muerto
