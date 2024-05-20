import { ReactNode } from "react";
import MaxWidthWraper from "../_components/MaxWidthWrapper";
import Steps from "../_components/Steps";

const Layout = ({children}:{children: ReactNode}) => {
  return (
    <MaxWidthWraper className="flex-1 flex flex-col">
      <Steps />
      {children}
    </MaxWidthWraper>
  )
}

export default Layout;
