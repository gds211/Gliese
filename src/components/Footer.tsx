import LatestBlockIndicator from './LatestBlockIndicator';

const Footer = () => {
  return (
    <footer className="flex items-center justify-between px-6 py-4 backdrop-blur-sm border-t-[0.3px] border-border">
      <div className="flex items-center gap-4">
        <LatestBlockIndicator />
      </div>
      
      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        <a 
          href="#" 
          className="hover:text-foreground transition-colors"
        >
          Docs
        </a>
        <a 
          href="#" 
          className="hover:text-foreground transition-colors"
        >
          Support
        </a>
        <a 
          href="#" 
          className="hover:text-foreground transition-colors"
        >
          Terms
        </a>
      </div>
    </footer>
  );
};

export default Footer;