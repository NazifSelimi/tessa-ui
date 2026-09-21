import { Button, Result } from 'antd';
import { Link } from 'react-router-dom';
import Seo from '@/shared/components/Seo';

export default function NotFoundPage() {
  return (
    <>
      <Seo
        title="Page not found"
        description="The requested page could not be found."
        noIndex
      />
      <Result
        status="404"
        title="404"
        subTitle="The page you requested does not exist or has moved."
        extra={<Link to="/shop"><Button type="primary">Back to shop</Button></Link>}
      />
    </>
  );
}
