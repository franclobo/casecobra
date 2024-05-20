import React from "react"
import MaxWidthWraper from "./MaxWidthWrapper"
import Link from "next/link"

function Footer() {
  return (
    <footer className="bg-white h-20 relative">
      <MaxWidthWraper>
        <div className="border-t border-gray-200" />
        <div className="h-full flex flex-col md:flex-row md:justify-between justify-center items-center">
          <div className="text-center md:text-left pb-2 md:pb-0">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Todos los derechos reservados
            </p>
          </div>

          <div className="flex items-center justify-center">
            <div className="flex space-x-8">
              <Link
                href="#"
                className="text-sm text-muted-foreground hover:text-gray-600"
              >
                Términos del Servicio
              </Link>
              <Link
                href="#"
                className="text-sm text-muted-foreground hover:text-gray-600"
              >
                Políticas de Privacidad
              </Link>
              <Link
                href="#"
                className="text-sm text-muted-foreground hover:text-gray-600"
              >
                Política de Cookies
              </Link>
            </div>
          </div>
        </div>
      </MaxWidthWraper>
    </footer>
  );
}

export default Footer
