import React from "react";
import ReactDOM from "react-dom";


class ContentEditable extends React.Component {
  constructor(props) {
    super(props);
    this.lastHTML = this.props.html;
  }

  render() {
    return (
      <div
        onBlur={(e) => this.emitChange(e)}
        contentEditable
        dangerouslySetInnerHTML={{__html: this.props.html}}/>
    );
  }

  emitChange(e) {
    var html = e.nativeEvent.target.innerHTML;
    // make sure the value has actually changed before sending any notifications.
    // for example, the user could have just entered the cell then left without
    // changing content - this would still fire the onBlur event
    if (html !== this.lastHTML) {
      this.props.onChange(html);
    }
    this.lastHTML = html;
  }
}


export class Cell extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      edited: props.display
    }
  }

  render() {
    if (this.props.onChange) {
      return (
        <td
          style={this.props.style}
          colSpan={this.props.colSpan}
          rowSpan={this.props.rowSpan}>
          <ContentEditable
            html={this.state.edited}
            onChange={(e) => this.props.onChange(e)}/>
        </td>
      );
    }
    else {
      if (typeof this.props.display === "string") {
        return <td
                style={this.props.style}
                colSpan={this.props.colSpan}
                rowSpan={this.props.rowSpan}
                dangerouslySetInnerHTML={{__html: this.props.display}}/>;
      }
      else {
        return (
          <td
            style={this.props.style}
            colSpan={this.props.colSpan}
            rowSpan={this.props.rowSpan}>
            {this.props.display}
          </td>
        );
      }
    }
  }

  onChange(e) {
    this.setState({edited: e});
    this.props.onChange(e);
  }
}

Cell.defaultProperties = {
  colSpan: 1,
  rowSpan: 1
}

const CoerceCells = (cells) => {
  var coerced = {};
  Object.keys(cells).forEach(function(c, j) {
    var cell = cells[c];
    coerced[c] = {
      sortVal: cell.sortVal || cell,
      display: cell.display  || cell,
      onChange: cell.onChange
    };
  })
  return coerced;
}


const CoerceRow = (row) => {
  return {
    children: (row.children || []).map(c => CoerceRow(c)),
    expanded: false,
    cells: CoerceCells(row.cells || row)
  }
}


class Row extends React.Component {
  constructor(props) {
    super(props)

    // Child rows may not have the same column set as top-level rows.
    // When this is the case, adjust the colspan to automatically distribute
    // cells across the entire table width
    this.colSpan = this.props.tableWidthCols / Object.keys(this.props.cells).length
  }

  renderExpander() {
    if (this.props.expanderCol) {
      if (this.props.expanderBtn) {
        return (
          <td style={{width: "34px"}}>
            <ExpanderButton
              expanded={this.props.expanded}
              onClick={() => {
                this.props.onExpand(!this.props.expanded);
              }}/>
          </td>
        );
      }
      else {
        return <td/>
      }
    }
  }

  render() {
    return (
      <tr>
        {
          this.renderExpander()
        }
        {
          Object.values(this.props.cells).map((c, j) =>
            <Cell
              key={j}
              display={c.display}
              onChange={c.onChange}
              colSpan={this.colSpan}
            />
          )
        }
      </tr>
    );
  }
}

const ExpanderButton = (props) => {
  return (
      <button
        className="btn btn-primary btn-xs"
        style={{width:"22px"}} // keep button from changing width between +/-
        onClick={() => props.onClick()}>
        {props.expanded ? "-" : "+"}
      </button>
  );
}


const SortArrow = (props) => {
  var rotate = props.rotate || (props.down ? 90 : -90);
  return (
    <div style={{WebkitTransform: `rotate(${rotate}deg)`, display: "inline-block", marginLeft: "5px"}}>➜</div>
  )
}


const TableHeader = (props) => {
  const renderArrow = () => {
    if (props.sortBy) {
      return <SortArrow down={props.sortDesc}/>
    }
  };
  return (
    <th key={props.col} onClick={props.onClick}>
      {props.col}
      {renderArrow()}
    </th>
  );
}

const SearchBar = (props) => {
  return (
    <form>
      <div className="form-group" style={props.style}>
        <div className="input-group">
          <div className="input-group-addon">
            <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABQ0lEQVQ4T53SvyvtcRzH8Yckg8LAzR/AgNxRke6NgT+AhVIGRkqSge6im+6o3NUgJPcORhaTyGByDUySgYv1DnK7t7c+R9++zjnFd/u+36/P8/3rVeH1V49O1OIKJ/hbRPccqsgkavAN46jOxK8xh81ikAIgHu+jGV/wEw9oxVSCLuBrHlIArGAYXbgoUmkSy+jBYTYfgJj5BjP4XmLW0B0k3WAe0I89NOG21LIwjXk05AFD+IEqPJUBjGI16V5k0Vqc7BgfcVoGsIQo1pLvoBKX2MVECUB44hzrmM0D4n8EG+lkcZF/GVE83sYAOvCrGCBisaBFHCUf3KMNY2nBoTlDH34XIFknRqw7nfMz6tJoO1jDVgIGpBd3eSuX2d9z6kNya3saIzq5y3fwFkhc7NNbAVGgMXUSlxt8DyAgYf8/ePwPza86J6hmCwMAAAAASUVORK5CYII="/>
          </div>
          <input
            type="text"
            className="form-control"
            placeholder={props.placeholder}
            onChange={props.onChange}/>
        </div>
      </div>
    </form>
  );
};

SearchBar.defaultProps = {
  placeholder: "Type to search"
}


const ExportButton = (props) => {
  return (
    <button
      type="button"
      className="btn btn-primary btn-sm"
      onClick={props.onClick}
      style={{marginRight: "5px"}}>
      Export to {props.format}
    </button>
  );
}


const expandRows = (rows, force) => {
  // recursively expand any collapsed rows
  var expanded = [];
  rows.forEach(function(r) {
    expanded.push(r)
    if (r.expanded || force) {
      expanded = expanded.concat(expandRows(r.children))
    }
  });
  return expanded;
}


export class SearchTable extends React.Component {
  constructor(props) {
    super(props);

    // coerce all row definitions to standard format
    var coercedRows = props.rows.map(r => CoerceRow(r))

    // see if any rows are expandable
    this.expandable = coercedRows.some(r => r.children.length)

    // recursively expand any collapsed rows and assign unique indexes
    expandRows(coercedRows, true).forEach(function(r, i) {
      r.key = i;
    });

    this.columns = Object.keys(coercedRows[0].cells),

    this.state = {
      search: '',
      sortBy: this.props.sortBy || this.columns[0],
      sortDesc: this.props.sortDesc,
      // This is pretty goofy - since I want to be able to have expandable rows,
      // I need to keep track of each row"s expanded state on the table, since
      // I can't render the expanded child directly from the row component :|
      // Surely there's a better way, but I can't find it
      rows: coercedRows
    };
  }

  setSort(col) {
    if (this.state.sortBy == col) {
      this.setState({
        sortDesc: !this.state.sortDesc
      })
    }
    else {
      this.setState({
        sortBy: col,
        sortDesc: false
      })
    }
  }

  sort() {
    return this.state.rows.sort((a, b) => {
      var diff = a.cells[this.state.sortBy].sortVal > b.cells[this.state.sortBy].sortVal;
      return this.state.sortDesc ? !diff : diff;
    });
  }

  filter(rows) {
    var searchTokens = this.props.search.split(/[ ,]+/),
        regexes = searchTokens.map(st => new RegExp(st, "gi")),
        filtered = rows.filter(row =>
          regexes.every(re =>
            Object.values(row.cells).some(c =>
              String(c.display).match(re))));
    return filtered
  }

  displayedRows() {
    return this.filter(expandRows(this.sort()));
  }

  renderExportButtons() {
    if (this.props.showExportBtn) {
      return (
        <div className="row" style={{margin: "auto"}}>
          <ExportButton format="CSV" onClick={()=>this.exportFile("table.csv")}/>
          <ExportButton format="JSON" onClick={()=>this.exportFile("table.json")}/>
        </div>
      );
    }
  }

  renderSearchBar() {
    if (this.props.showSearchBar) {
      return (
        <SearchBar
          placeholder={this.props.searchPrompt}
          onChange={(e) => this.setState({search: e.target.value})}/>
      );
    }
  }

  render() {
    return (
      <div style={this.props.style}>
        {this.renderSearchBar()}
        <table className={this.props.className}>
          <thead>
            <tr>
              {this.expandable ? <th/> : null}
              {
              this.columns.map(col =>
                <TableHeader
                  key={col}
                  col={col}
                  onClick={() => this.setSort(col)}
                  sortBy={col == this.state.sortBy}
                  sortDesc={this.state.sortDesc}/>)
              }
            </tr>
          </thead>
          <tbody>{
            this.displayedRows().map(r =>
              <Row
                key={r.key}
                cells={r.cells}
                tableWidthCols={this.columns.length}
                expanded={r.expanded}
                expanderCol={this.expandable}
                expanderBtn={r.children.length > 0}
                onExpand={
                  (ex) => {
                    r.expanded = ex;
                    this.setState({rows: this.state.rows})
                  }
                }
              />
            )
          }</tbody>
        </table>

        {this.renderExportButtons()}
      </div>
    );
  }

  exportFile(filename) {
    var blob = null,
        a = document.createElement("a");

    if (filename.endsWith("csv")) {
      var validRows = this.displayedRows().filter(r => Object.keys(r.cells).join(",") == this.columns.join(",")),
          dataRows = validRows.map(r => this.columns.map(c => r.cells[c].display)),
          rows = [this.columns].concat(dataRows),
          csv = rows.map(r => r.join(",")).join("\n");

      blob = new Blob([csv], {type: "text/csv"});
    }
    else {
      blob = new Blob([JSON.stringify(this.props.rows, null, 2)], {type: "text/json"});
    }

    a.download = filename;
    a.href = window.URL.createObjectURL(blob);
    a.click();
  }
};


SearchTable.defaultProps = {
  className: "table table-bordered table-striped",
  search: "",
  searchPrompt: "Type to search",
  showExportBtn: {false},
  showSearchBar: {true},
  style: {margin: "10px"}
};



module.exports = SearchTable;