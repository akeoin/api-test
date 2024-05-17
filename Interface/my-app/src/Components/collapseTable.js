import * as React from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

function Row(props) {
  const { row } = props;
  const [open, setOpen] = React.useState(false);

  return (
    <React.Fragment>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => setOpen(!open)}
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row">
          {row.fileName}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1 }}>
              <Typography variant="h6" gutterBottom component="div">
                History
              </Typography>
              <Table size="small" aria-label="purchases">
                <TableHead>
                  <TableRow>
                    <TableCell>Index</TableCell>
                    <TableCell align="right">Name</TableCell>
                    <TableCell align="right">Method</TableCell>
                    <TableCell align="right">Before Payload</TableCell>
                    <TableCell align="right">Modified Payload</TableCell>
                    <TableCell align="right">Expected Response</TableCell>
                    <TableCell align="right">Actual Response</TableCell>
                    <TableCell align="right">Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {row.data2.map((dataRow, rowIndex) => (
                    <TableRow key={rowIndex}>
                      <TableCell>{dataRow.Index}</TableCell>
                      <TableCell align="right">{dataRow.Name}</TableCell>
                      <TableCell align="right">{dataRow.Method}</TableCell>
                      <TableCell align="right"><pre>{JSON.stringify(dataRow.BeforePayload,null,6)}</pre></TableCell>
                      <TableCell align="right"><pre>{JSON.stringify(dataRow.ModifiedPayload,null,6)}</pre></TableCell>
                      <TableCell align="right"><pre>{JSON.stringify(dataRow.ExpectedResponse,null,6)}</pre></TableCell>
                      <TableCell align="right"><pre>{JSON.stringify(dataRow.ActualResponse,null,6)}</pre></TableCell>
                      <TableCell align="right">{dataRow.Status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
}

Row.propTypes = {
  row: PropTypes.shape({
    fileName: PropTypes.string.isRequired,
    data2: PropTypes.arrayOf(
      PropTypes.shape({
        Index: PropTypes.number.isRequired,
        Name: PropTypes.string.isRequired,
        Method: PropTypes.string.isRequired,
        BeforePayload: PropTypes.object,
        ModifiedPayload: PropTypes.object,
        ExpectedResponse: PropTypes.object,
        ActualResponse: PropTypes.object,
        Status: PropTypes.number.isRequired,
      })
    ).isRequired,
  }).isRequired,
};

export default function CollapsibleTable() {
  const [data, setData] = React.useState([]);

  React.useEffect(() => {
    const eventSource = new EventSource('http://localhost:5000/events');

    eventSource.onmessage = (event) => {
      const eventData = JSON.parse(event.data);
      console.log("Event Data", eventData);
      
      if (eventData.TestFileName) {
        console.log("EventData.testFileName: " + eventData.TestFileName);
        setData(prevData => {
          const existingEntry = prevData.find(item => item.fileName === eventData.TestFileName);
          if (!existingEntry) {
            return [...prevData, { fileName: eventData.TestFileName, data2: [] }];
          }
          return prevData;
        });
      } else if (eventData.Index !== undefined) {
        console.log("Event Data2: ",eventData)
        console.log("Item.filename", eventData.filename)
        setData(prevData => {
          return prevData.map(item => {
           
              console.log("File Name: ",item.fileName)
              return { ...item, data2: [...item.data2, eventData] };
            
          });
        });
      }
    };

    eventSource.onerror = (event) => {
      console.error('EventSource failed:', event);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <TableContainer component={Paper}>
      <Table aria-label="collapsible table">
        <TableHead>
          <TableRow>
            <TableCell />
            <TableCell>File Name</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row, index) => (
            <Row key={index} row={row} />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
