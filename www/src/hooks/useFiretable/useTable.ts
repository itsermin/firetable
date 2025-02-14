import { db } from "../../firebase";

import { useEffect, useReducer } from "react";
import equals from "ramda/es/equals";
import firebase from "firebase/app";
import { algoliaUpdateDoc } from "../../firebase/callables";
import { FireTableFilter } from ".";

const CAP = 1000; // safety  paramter sets the  upper limit of number of docs fetched by this hook

const tableReducer = (prevState: any, newProps: any) => {
  return { ...prevState, ...newProps };
};
const tableInitialState = {
  rows: [],
  prevFilters: null,
  prevPath: null,
  path: null,
  filters: [],
  prevLimit: 0,
  limit: 20,
  loading: true,
  sort: { field: "createdAt", direction: "asc" },
  cap: CAP,
};

const useTable = (initialOverrides: any) => {
  const [tableState, tableDispatch] = useReducer(tableReducer, {
    ...tableInitialState,
    ...initialOverrides,
  });
  /**  set collection listener
   *  @param filters
   *  @param limit max number of docs
   *  @param sort
   */
  const getRows = (
    filters: {
      key: string;
      operator: "==" | "<" | ">" | ">=" | "<=";
      value: string;
    }[],
    limit: number,
    sort:
      | { field: string; direction: "asc" | "desc" }[]
      | { field: string; direction: "asc" | "desc" }
  ) => {
    //unsubscribe from old path
    if (tableState.prevPath && tableState.path !== tableState.prevPath) {
      tableState.unsubscribe();
    }
    //updates previous values
    tableDispatch({
      prevFilters: filters,
      prevLimit: limit,
      prevPath: tableState.path,
      loading: true,
    });
    let query:
      | firebase.firestore.CollectionReference
      | firebase.firestore.Query = db.collection(tableState.path);

    filters.forEach(filter => {
      query = query.where(filter.key, filter.operator, filter.value);
    });
    if (sort) {
      if (Array.isArray(sort)) {
        sort.forEach(order => {
          query = query.orderBy(order.field, order.direction);
        });
      } else {
        query = query.orderBy(sort.field, sort.direction);
      }
    }
    const unsubscribe = query.limit(limit).onSnapshot(
      snapshot => {
        if (snapshot.docs.length > 0) {
          const rows = snapshot.docs
            .map(doc => {
              const data = doc.data();
              const id = doc.id;
              const ref = doc.ref;

              return { ...data, id, ref };
            })
            .filter(doc => doc.id !== "_FIRETABLE_"); //removes schema file
          tableDispatch({
            rows,
            loading: false,
          });
        } else {
          tableDispatch({
            rows: [],
            loading: false,
          });
        }
      },
      (error: Error) => {
        //TODO:callable to create new index
        if (error.message.includes("indexes?create_composite=")) {
          const url =
            "https://console.firebase.google.com/project/firetable-antler/database/firestore/" +
            "indexes?create_composite=" +
            error.message.split("indexes?create_composite=")[1];
          console.log(url);
        }
      }
    );
    tableDispatch({ unsubscribe });
  };
  useEffect(() => {
    const {
      prevFilters,
      filters,
      prevLimit,
      limit,
      prevPath,
      path,
      sort,
      unsubscribe,
    } = tableState;
    if (
      !equals(prevFilters, filters) ||
      prevLimit !== limit ||
      prevPath !== path
    ) {
      if (path) getRows(filters, limit, sort);
    }
    return () => {
      if (unsubscribe) {
        tableState.unsubscribe();
      }
    };
  }, [tableState.filters, tableState.limit, tableState.path]);
  /**  used deleting row/doc
   *  @param rowIndex local position
   *  @param documentId firestore document id
   */
  const deleteRow = (rowIndex: number, documentId: string) => {
    //remove row locally
    tableState.rows.splice(rowIndex, 1);
    tableDispatch({ rows: tableState.rows });
    // delete document
    db.collection(tableState.path)
      .doc(documentId)
      .delete();
  };
  /**  used for setting up the table listener
   *  @param tableCollection firestore collection path
   *  @param filters specify filters to be applied to the query
   */
  const setTable = (tableCollection: string, filters?: FireTableFilter) => {
    if (tableCollection !== tableState.path) {
      tableDispatch({ path: tableCollection, rows: [] });
    }
    if (filters) tableDispatch({ filters });
  };

  /**  creating new document/row
   *  @param data(optional: default will create empty row)
   */
  const addRow = async (data?: any) => {
    const ref = await db.collection(tableState.path).add({
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      ...data,
    });
    if (data) {
      algoliaUpdateDoc({
        collection: ref.parent.path,
        id: ref.id,
        doc: { ...data },
      });
    }
  };
  /**  used for incrementing the number of rows fetched
   *  @param additionalRows number additional rows to be fetched (optional: default is 20)
   */
  const moreRows = (additionalRows?: number) => {
    tableDispatch({
      limit: tableState.limit + (additionalRows ? additionalRows : 20),
    });
  };
  const tableActions = { deleteRow, setTable, addRow, moreRows };
  return [tableState, tableActions];
};

export default useTable;
