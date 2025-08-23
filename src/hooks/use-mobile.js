import * as React from "react"

//* Custom hook: detect if screen width is below the mobile breakpoint

const MOBILE_BREAKPOINT = 768 // screen width threshold for mobile

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(undefined) // track if current view is mobile

  React.useEffect(() => {
    // create media query for mobile detection
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)

    // handler to update state on screen resize
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }

    // listen for changes
    mql.addEventListener("change", onChange)

    // set initial value
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)

    // cleanup listener when unmounted
    return () => mql.removeEventListener("change", onChange);
  }, [])

  return !!isMobile // always return boolean (true = mobile, false = desktop)
}

