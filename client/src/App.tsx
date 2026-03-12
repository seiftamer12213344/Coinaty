import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import NotFound from "@/pages/not-found";

// Pages
import Home from "./pages/Home";
import AddCoin from "./pages/AddCoin";
import CoinDetails from "./pages/CoinDetails";
import Profile from "./pages/Profile";
import Leaderboard from "./pages/Leaderboard";
import Messages from "./pages/Messages";
import Search from "./pages/Search";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/add-coin" component={AddCoin} />
      <Route path="/coin/:id" component={CoinDetails} />
      
      {/* Profile: can view own or another user's */}
      <Route path="/profile" component={Profile} />
      <Route path="/profile/:id" component={Profile} />
      
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/messages" component={Messages} />
      <Route path="/search" component={Search} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
