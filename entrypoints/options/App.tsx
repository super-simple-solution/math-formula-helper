import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs"
import { useState } from "react"
import { siderMenuList } from "./const"
import { Feedback } from "./components/feedback"
import { Dollar } from "./components/dollar"
import logo from '@/assets/icons/128.png'

type TabValue = typeof siderMenuList[number]['value']
const defaultTab = siderMenuList[0].value

function App() {
  const [curTab, setCurTab] = useState<TabValue>(defaultTab)

  const contentMap: Record<TabValue, React.ReactNode> = {
    dollar: <Dollar></Dollar>,
    feedback: <Feedback></Feedback>
  }

    return (
      <div className="flex justify-center h-screen">
        <div className="w-2/3 min-w-[600px] max-w-[1000px]">
          <Tabs defaultValue={curTab} orientation="vertical" className="flex" onValueChange={(val: string) => setCurTab(val as TabValue)}>
            <div className="h-screen bg-[#f5f5f5] min-w-[240px] px-4">
              <div className="flex items-center pt-20">
                <img src={logo} alt="logo" className="w-10" />
                <div className="ml-4 font-bold text-xl">Latex Copy</div>
              </div>
              <TabsList className="flex flex-col justify-start mt-4">
                {siderMenuList.map((item) => (
                  <TabsTrigger
                    className={`w-full py-3 justify-start !shadow-none ${item.value === curTab ? '!bg-blue-100' : ''}`}
                    key={item.value}
                    value={item.value}
                  >
                    {item.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            <div className="flex-auto pl-4">
              {siderMenuList.map((item) => (
                <TabsContent className="flex-1 p-6" key={item.value} value={item.value}>{contentMap[item.value]}</TabsContent>
              ))}
            </div>
          </Tabs>
        </div>
      </div>
    )
}

export default App;
