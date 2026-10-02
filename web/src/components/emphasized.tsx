/** El resumen y los logros traen énfasis en markdown. Se renderiza como negrita
 *  real en vez de mostrar los asteriscos — el texto plano del pipeline conserva
 *  el énfasis porque es prosa, no dato estructurado. */
export function Emphasized({ text }: { readonly text: string }) {
  const parts = text.split('**')
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? <strong key={index}>{part}</strong> : <span key={index}>{part}</span>,
      )}
    </>
  )
}
